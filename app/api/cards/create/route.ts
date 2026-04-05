import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  getConnection,
  verifyBurnTransaction,
  TIER_BURN_AMOUNTS,
} from "@/lib/solana";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const ALLOWED_MIME = new Set([
  "image/jpeg", "image/jpg", // image/jpg is non-standard but some Android browsers send it
  "image/png",
  "image/webp",
  "image/heic", "image/heif", // iOS Safari passes these through
]);
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB (Nginx allows 50m)

const baseSchema = z.object({
  mode: z.enum(["FREE", "CRYPTO"]).default("CRYPTO"),
  tier: z.number().int().min(1).max(2),
  recipientName: z.string().max(100).optional(),
  message: z.string().min(1).max(2000),
  background: z.string().min(1).max(50),
  emojis: z.string().max(100).optional(),
  musicTrack: z.string().max(20).optional(),
  memoText: z.string().max(200).optional(),
  txSignature: z.string().min(80).max(90).optional(),
});

const log = (reqId: string, msg: string, extra?: unknown) => {
  const base = `[cards/create][${reqId}] ${msg}`;
  if (extra !== undefined) console.log(base, extra);
  else console.log(base);
};

export async function POST(req: NextRequest) {
  const reqId = randomUUID().slice(0, 8);
  try {
    const contentType = req.headers.get("content-type") ?? "(none)";
    const contentLength = req.headers.get("content-length") ?? "unknown";
    log(reqId, `→ POST content-type="${contentType}" content-length=${contentLength}B`);

    // ── Auth ────────────────────────────────────────────────────────────────
    let session;
    try {
      session = await auth();
    } catch (authErr) {
      log(reqId, "✗ auth() threw:", authErr);
      return NextResponse.json({ error: "Authentication error. Please sign in again." }, { status: 401 });
    }
    if (!session?.user?.id) {
      log(reqId, "✗ No session / not signed in");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    log(reqId, `✓ auth userId=${session.user.id}`);

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) {
      log(reqId, "✗ User not found in DB");
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ── Parse body ──────────────────────────────────────────────────────────
    let fields: Record<string, string> = {};
    let photoBuffer: Buffer | null = null;
    let photoMime: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      let formData: FormData;
      try {
        formData = await req.formData();
        log(reqId, "✓ formData parsed");
      } catch (fdErr) {
        log(reqId, "✗ req.formData() threw:", fdErr);
        return NextResponse.json(
          { error: "Failed to parse form data. File may be too large or corrupted." },
          { status: 413 }
        );
      }

      for (const [key, value] of formData.entries()) {
        if (key === "photo" && value instanceof File) {
          log(reqId, `  photo: name="${value.name}" size=${value.size}B type="${value.type}"`);
          if (value.size > MAX_FILE_SIZE) {
            log(reqId, `✗ photo too large: ${value.size}B > ${MAX_FILE_SIZE}B`);
            return NextResponse.json({ error: "Photo exceeds 50MB limit" }, { status: 400 });
          }
          const normalizedType = value.type === "image/jpg" ? "image/jpeg" : value.type;
          if (!ALLOWED_MIME.has(normalizedType)) {
            log(reqId, `✗ rejected MIME type: "${value.type}" (normalized: "${normalizedType}")`);
            return NextResponse.json(
              { error: `Unsupported image format "${value.type}". Use JPEG, PNG, WebP, or HEIC.` },
              { status: 400 }
            );
          }
          try {
            photoBuffer = Buffer.from(await value.arrayBuffer());
            log(reqId, `✓ photo buffered ${photoBuffer.length}B`);
          } catch (bufErr) {
            log(reqId, "✗ arrayBuffer() threw:", bufErr);
            return NextResponse.json({ error: "Failed to read photo data." }, { status: 500 });
          }
          photoMime = normalizedType || "image/jpeg";
        } else if (typeof value === "string") {
          fields[key] = value;
        }
      }
    } else {
      try {
        fields = await req.json();
        log(reqId, "✓ JSON body parsed");
      } catch (jsonErr) {
        log(reqId, "✗ req.json() threw:", jsonErr);
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }
    }

    // ── Validate fields ─────────────────────────────────────────────────────
    const parsed = baseSchema.safeParse({ ...fields, tier: Number(fields.tier) });
    if (!parsed.success) {
      log(reqId, "✗ Zod validation failed:", parsed.error.flatten());
      return NextResponse.json(
        { error: "Invalid card data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { mode, tier, txSignature, recipientName, message, background, emojis, musicTrack, memoText } =
      parsed.data;
    log(reqId, `✓ validated mode=${mode} tier=${tier} hasPhoto=${!!photoBuffer}`);

    if (tier === 2 && !photoBuffer) {
      log(reqId, "✗ tier 2 but no photo received");
      return NextResponse.json({ error: "Tier 2 requires a photo upload" }, { status: 400 });
    }

    // ── CRYPTO: verify transaction ──────────────────────────────────────────
    let finalBurnTxSig: string | null = null;
    let burnAmountAnn = 0;

    if (mode === "CRYPTO") {
      if (!user.walletAddress) {
        log(reqId, "✗ CRYPTO mode but user has no wallet");
        return NextResponse.json({ error: "Connect a Solana wallet to use Crypto mode" }, { status: 400 });
      }
      if (!txSignature) {
        log(reqId, "✗ CRYPTO mode but no txSignature");
        return NextResponse.json({ error: "Transaction signature is required for Crypto mode" }, { status: 400 });
      }

      const expectedBurn = TIER_BURN_AMOUNTS[tier];
      if (!expectedBurn) {
        log(reqId, `✗ invalid tier ${tier}`);
        return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
      }

      const existingCard = await prisma.card.findUnique({ where: { burnTxSig: txSignature } });
      if (existingCard) {
        log(reqId, "✗ tx already used:", txSignature);
        return NextResponse.json({ error: "This transaction has already been used" }, { status: 409 });
      }

      log(reqId, `  verifying burn tx=${txSignature.slice(0, 12)}… expectedBurn=${expectedBurn}`);
      const connection = getConnection();
      const { valid, reason } = await verifyBurnTransaction(
        connection,
        txSignature,
        expectedBurn,
        user.walletAddress
      );
      if (!valid) {
        log(reqId, `✗ tx invalid: ${reason}`);
        return NextResponse.json({ error: `Transaction invalid: ${reason}` }, { status: 400 });
      }
      log(reqId, "✓ tx verified");
      finalBurnTxSig = txSignature;
      burnAmountAnn = expectedBurn;
    }

    // ── Save photo ──────────────────────────────────────────────────────────
    let photoUrl: string | null = null;
    if (photoBuffer && photoMime) {
      const ext = photoMime === "image/webp" ? "webp" : photoMime === "image/png" ? "png" : "jpg";
      const filename = `card-${randomUUID()}.${ext}`;
      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      await fs.mkdir(uploadsDir, { recursive: true });
      await fs.writeFile(path.join(uploadsDir, filename), photoBuffer);
      photoUrl = `/uploads/${filename}`;
      log(reqId, `✓ photo saved: ${photoUrl}`);
    }

    // ── Create card ─────────────────────────────────────────────────────────
    const card = await prisma.card.create({
      data: {
        creatorId: user.id,
        mode,
        tier,
        burnAmountAnn,
        recipientName: recipientName ?? null,
        message,
        background,
        emojis: emojis ?? null,
        photoUrl,
        musicTrack: musicTrack ?? null,
        memoText: memoText ?? null,
        burnTxSig: finalBurnTxSig,
      },
      select: { slug: true },
    });

    log(reqId, `✓ card created slug=${card.slug}`);
    return NextResponse.json({ slug: card.slug });

  } catch (err) {
    console.error(`[cards/create][${reqId}] ✗ UNHANDLED:`, err);
    return NextResponse.json({ error: "Internal server error. Please try again." }, { status: 500 });
  }
}

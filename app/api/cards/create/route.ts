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

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const baseSchema = z.object({
  mode: z.enum(["FREE", "CRYPTO"]).default("CRYPTO"),
  tier: z.number().int().min(1).max(2),
  recipientName: z.string().max(100).optional(),
  message: z.string().min(1).max(2000),
  background: z.string().min(1).max(50),
  emojis: z.string().max(100).optional(),
  musicTrack: z.string().max(20).optional(),
  memoText: z.string().max(200).optional(),
  // txSignature only required for CRYPTO mode — validated below
  txSignature: z.string().min(80).max(90).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  let fields: Record<string, string> = {};
  let photoBuffer: Buffer | null = null;
  let photoMime: string | null = null;

  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    for (const [key, value] of formData.entries()) {
      if (key === "photo" && value instanceof File) {
        if (value.size > MAX_FILE_SIZE) {
          return NextResponse.json({ error: "Photo exceeds 5MB limit" }, { status: 400 });
        }
        if (!ALLOWED_MIME.has(value.type)) {
          return NextResponse.json({ error: "Only JPEG, PNG, and WebP images are allowed" }, { status: 400 });
        }
        photoBuffer = Buffer.from(await value.arrayBuffer());
        photoMime = value.type;
      } else if (typeof value === "string") {
        fields[key] = value;
      }
    }
  } else {
    fields = await req.json();
  }

  const parsed = baseSchema.safeParse({ ...fields, tier: Number(fields.tier) });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid card data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { mode, tier, txSignature, recipientName, message, background, emojis, musicTrack, memoText } =
    parsed.data;

  // Tier 2 requires a photo regardless of mode
  if (tier === 2 && !photoBuffer) {
    return NextResponse.json({ error: "Tier 2 requires a photo upload" }, { status: 400 });
  }

  let finalBurnTxSig: string | null = null;
  let burnAmountAnn = 0;

  if (mode === "CRYPTO") {
    // Wallet is required for crypto mode
    if (!user.walletAddress) {
      return NextResponse.json({ error: "Connect a Solana wallet to use Crypto mode" }, { status: 400 });
    }
    if (!txSignature) {
      return NextResponse.json({ error: "Transaction signature is required for Crypto mode" }, { status: 400 });
    }

    const expectedBurn = TIER_BURN_AMOUNTS[tier];
    if (!expectedBurn) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    // Deduplicate
    const existingCard = await prisma.card.findUnique({ where: { burnTxSig: txSignature } });
    if (existingCard) {
      return NextResponse.json({ error: "This transaction has already been used" }, { status: 409 });
    }

    // Verify burn on-chain
    const connection = getConnection();
    const { valid, reason } = await verifyBurnTransaction(
      connection,
      txSignature,
      expectedBurn,
      user.walletAddress
    );
    if (!valid) {
      return NextResponse.json({ error: `Transaction invalid: ${reason}` }, { status: 400 });
    }

    finalBurnTxSig = txSignature;
    burnAmountAnn = expectedBurn;
  }
  // FREE mode: no tx needed, burnAmountAnn stays 0, finalBurnTxSig stays null

  // Save photo if provided
  let photoUrl: string | null = null;
  if (photoBuffer && photoMime) {
    const ext = photoMime === "image/webp" ? "webp" : photoMime === "image/png" ? "png" : "jpg";
    const filename = `card-${randomUUID()}.${ext}`;
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.writeFile(path.join(uploadsDir, filename), photoBuffer);
    photoUrl = `/uploads/${filename}`;
  }

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

  return NextResponse.json({ slug: card.slug });
}

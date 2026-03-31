import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  getConnection,
  loadAirdropKeypair,
  ANN_MINT,
  ANN_DECIMALS,
} from "@/lib/solana";
import {
  getOrCreateAssociatedTokenAccount,
  transferChecked,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";

// Simple in-memory rate limiter (per process; fine for single-instance VPS MVP)
const claimTimestamps = new Map<string, number>();
const RATE_LIMIT_MS = 60_000; // 1 min

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Rate limit
  const last = claimTimestamps.get(userId);
  if (last && Date.now() - last < RATE_LIMIT_MS) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  claimTimestamps.set(userId, Date.now());

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (user.airdropClaimed) {
    return NextResponse.json({ error: "Airdrop already claimed" }, { status: 409 });
  }

  if (!user.walletAddress) {
    return NextResponse.json(
      { error: "Connect a Solana wallet first" },
      { status: 400 }
    );
  }

  const connection = getConnection();
  // Airdrop wallet holds pre-minted ANN — we transfer from it, never mint new tokens
  const airdropKeypair = loadAirdropKeypair();
  const recipientPubkey = new PublicKey(user.walletAddress);

  // Amount: 2,000 ANN (fixed supply — transfer only, no new minting)
  const AIRDROP_AMOUNT = BigInt(2000) * BigInt(10 ** ANN_DECIMALS);

  try {
    // Get the airdrop wallet's ATA (must already exist and hold ANN)
    const airdropAta = await getOrCreateAssociatedTokenAccount(
      connection,
      airdropKeypair, // payer for any account creation fees
      ANN_MINT,
      airdropKeypair.publicKey
    );

    // Get or create the recipient's ATA (airdrop wallet pays creation fee)
    const recipientAta = await getOrCreateAssociatedTokenAccount(
      connection,
      airdropKeypair, // payer
      ANN_MINT,
      recipientPubkey
    );

    // Transfer ANN from airdrop wallet ATA → recipient ATA
    const txSig = await transferChecked(
      connection,
      airdropKeypair,        // payer + authority
      airdropAta.address,    // source ATA
      ANN_MINT,              // mint
      recipientAta.address,  // destination ATA
      airdropKeypair,        // owner of source ATA
      AIRDROP_AMOUNT,        // amount in smallest units
      ANN_DECIMALS           // decimals for safety check
    );

    // Mark claimed
    await prisma.user.update({
      where: { id: userId },
      data: { airdropClaimed: true, airdropTxSig: txSig },
    });

    return NextResponse.json({
      txSig,
      explorerUrl: `https://explorer.solana.com/tx/${txSig}`,
    });
  } catch (err) {
    console.error("Airdrop error:", err);
    return NextResponse.json(
      { error: "Failed to send airdrop. Please try again." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { PublicKey } from "@solana/web3.js";

const schema = z.object({
  walletAddress: z.string().min(32).max(44),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const result = schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  // Validate it's a valid Solana public key
  try {
    new PublicKey(result.data.walletAddress);
  } catch {
    return NextResponse.json({ error: "Invalid Solana public key" }, { status: 400 });
  }

  // Check wallet not already claimed by another user
  const existing = await prisma.user.findUnique({
    where: { walletAddress: result.data.walletAddress },
  });
  if (existing && existing.id !== session.user.id) {
    return NextResponse.json(
      { error: "Wallet already associated with another account" },
      { status: 409 }
    );
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { walletAddress: result.data.walletAddress },
    select: { id: true, walletAddress: true, airdropClaimed: true },
  });

  return NextResponse.json(updated);
}

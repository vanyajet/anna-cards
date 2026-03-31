import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const card = await prisma.card.findUnique({ where: { slug } });
  if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!card.openedAt) {
    await prisma.card.update({
      where: { slug },
      data: { openedAt: new Date(), status: "OPENED" },
    });
  }

  return NextResponse.json({ ok: true });
}

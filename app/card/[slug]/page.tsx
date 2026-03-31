import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CardReveal } from "./CardReveal";

export default async function CardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const card = await prisma.card.findUnique({
    where: { slug },
    select: {
      slug: true,
      tier: true,
      recipientName: true,
      message: true,
      background: true,
      emojis: true,
      photoUrl: true,
      musicTrack: true,
      memoText: true,
      mode: true,
      burnTxSig: true,
      burnAmountAnn: true,
      openedAt: true,
      status: true,
    },
  });

  if (!card) notFound();

  return <CardReveal card={card} />;
}

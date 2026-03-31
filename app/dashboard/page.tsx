import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      walletAddress: true,
      airdropClaimed: true,
      airdropTxSig: true,
      cards: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          slug: true,
          tier: true,
          recipientName: true,
          burnAmountAnn: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  if (!user) redirect("/auth/signin");

  return <DashboardClient user={user} />;
}

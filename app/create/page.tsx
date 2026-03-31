import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CreateWizard } from "./CreateWizard";

export default async function CreatePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { walletAddress: true },
  });

  // walletAddress may be null — free mode doesn't need one
  return <CreateWizard walletAddress={user?.walletAddress ?? null} />;
}

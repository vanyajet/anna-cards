import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SignInForm } from "./SignInForm";

export default async function SignInPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-900 to-blue-900 flex items-center justify-center px-4">
      <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🎁</div>
          <h1 className="text-2xl font-bold text-white">Войти в Anna Cards</h1>
          <p className="text-indigo-300 mt-2 text-sm">
            Используйте Google или email для входа
          </p>
        </div>
        <SignInForm />
      </div>
    </main>
  );
}

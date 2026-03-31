"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isActive = (path: string) =>
    pathname === path
      ? "text-white font-semibold"
      : "text-pink-100/70 hover:text-white";

  return (
    <nav className="w-full sticky top-0 z-50 bg-slate-800 border-amber-600 border-b-4 shadow-lg">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-white font-bold text-lg">
          <span>🎁</span>
          <span className="hidden sm:inline tracking-wide">ANN Открытки</span>
        </Link>

        {/* Nav links — only shown when logged in */}
        {session?.user && (
          <div className="flex items-center gap-5 text-sm">
            <Link href="/dashboard" className={isActive("/dashboard")}>
              Кабинет
            </Link>
            <Link
              href="/create"
              className="bg-white/20 hover:bg-white/30 text-white font-semibold text-sm px-3 py-1.5 rounded-lg transition-colors"
            >
              + Создать
            </Link>
          </div>
        )}

        {/* Right side */}
        <div className="flex items-center gap-3 text-sm">
          {session?.user ? (
            <>
              <span className="text-pink-200 text-xs hidden sm:inline truncate max-w-[140px]">
                {session.user.email}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-pink-100/70 hover:text-white transition-colors"
              >
                Выйти
              </button>
            </>
          ) : (
            <Link
              href="/auth/signin"
              className="bg-white text-pink-700 hover:bg-pink-50 font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors"
            >
              Войти
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProviders } from "@/components/SessionProviders";
import { WalletProviders } from "@/components/WalletProviders";
import { Navbar } from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ANN Открытки",
  description: "Отправляйте открытки на блокчейне с токенами $ANN в сети Solana",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className={`${inter.className} min-h-full flex flex-col`}>
        <SessionProviders>
          <WalletProviders>
            <Navbar />
            {children}
          </WalletProviders>
        </SessionProviders>
      </body>
    </html>
  );
}

"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useEffect, useState } from "react";
import Link from "next/link";

type Card = {
  slug: string;
  tier: number;
  recipientName: string | null;
  burnAmountAnn: number;
  status: string;
  createdAt: Date | string;
};

type User = {
  id: string;
  name: string | null;
  email: string | null;
  walletAddress: string | null;
  airdropClaimed: boolean;
  airdropTxSig: string | null;
  cards: Card[];
};

export function DashboardClient({ user }: { user: User }) {
  const { publicKey, connected } = useWallet();
  const [walletSaved, setWalletSaved] = useState(!!user.walletAddress);
  const [airdropClaimed, setAirdropClaimed] = useState(user.airdropClaimed);
  const [airdropTx, setAirdropTx] = useState(user.airdropTxSig);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  // When wallet connects and user has no saved address, save it
  useEffect(() => {
    if (connected && publicKey && !walletSaved) {
      fetch("/api/wallet/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: publicKey.toString() }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.walletAddress) {
            setWalletSaved(true);
            setStatusMsg("Кошелёк подключён и сохранён!");
          } else {
            setStatusMsg(data.error ?? "Failed to save wallet");
          }
        });
    }
  }, [connected, publicKey, walletSaved]);

  async function handleClaimAirdrop() {
    setClaimLoading(true);
    setClaimError("");
    try {
      const res = await fetch("/api/airdrop/claim", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setClaimError(data.error ?? "Claim failed");
      } else {
        setAirdropClaimed(true);
        setAirdropTx(data.txSig);
        setStatusMsg("Аирдроп получен! 2 000 ANN отправлены на ваш кошелёк.");
      }
    } catch {
      setClaimError("Ошибка сети. Пожалуйста, попробуйте снова.");
    } finally {
      setClaimLoading(false);
    }
  }

  const walletAddr = publicKey?.toString() ?? user.walletAddress ?? null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-900 to-blue-900 px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">
            Добро пожаловать{user.name ? `, ${user.name}` : ""}!
          </h1>
          <p className="text-indigo-300 text-sm">{user.email}</p>
        </div>

        {statusMsg && (
          <div className="bg-green-500/20 border border-green-400/30 text-green-300 rounded-xl px-4 py-3 text-sm">
            {statusMsg}
          </div>
        )}

        {/* Wallet section */}
        <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-4">Кошелёк Solana</h2>
          {!connected ? (
            <div className="space-y-3">
              <p className="text-indigo-300 text-sm">
                Подключите кошелёк Solana для отправки и получения открыток.
              </p>
              <WalletMultiButton className="!bg-yellow-400 !text-gray-900 !font-bold !rounded-xl !py-2 !px-4 hover:!bg-yellow-300" />
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full" />
                <span className="text-green-300 text-sm font-medium">Подключён</span>
              </div>
              <p className="text-indigo-200 text-xs font-mono break-all">{walletAddr}</p>
              <WalletMultiButton className="!bg-white/10 !text-white !rounded-xl !text-sm !py-1 !px-3" />
            </div>
          )}
        </div>

        {/* Airdrop section */}
        {connected && walletSaved && !airdropClaimed && (
          <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-2xl p-6">
            <h2 className="text-yellow-300 font-semibold mb-2">Бета-аирдроп</h2>
            <p className="text-indigo-200 text-sm mb-4">
              Получите <span className="font-bold text-white">2 000 ANN</span> бета-аирдроп
              и начните создавать открытки.
            </p>
            {claimError && (
              <p className="text-red-400 text-sm mb-3">{claimError}</p>
            )}
            <button
              onClick={handleClaimAirdrop}
              disabled={claimLoading}
              className="bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-gray-900 font-bold py-2 px-6 rounded-xl transition-colors"
            >
              {claimLoading ? "Получение…" : "Получить 2 000 ANN бета-аирдроп"}
            </button>
          </div>
        )}

        {airdropClaimed && airdropTx && (
          <div className="bg-green-500/10 border border-green-400/30 rounded-2xl p-4">
            <p className="text-green-300 text-sm">
              Аирдроп получен!{" "}
              <a
                href={`https://explorer.solana.com/tx/${airdropTx}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Посмотреть в Solana Explorer
              </a>
            </p>
          </div>
        )}

        {/* Create card CTA */}
        <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-6 flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold">Создать открытку</h2>
            <p className="text-indigo-300 text-sm">Отправьте кому-то особое сообщение в блокчейне</p>
          </div>
          <Link
            href="/create"
            className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold py-2 px-5 rounded-xl transition-colors text-sm"
          >
            Создать
          </Link>
        </div>

        {/* Recent cards */}
        {user.cards.length > 0 && (
          <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-6">
            <h2 className="text-white font-semibold mb-4">Ваши открытки</h2>
            <div className="space-y-3">
              {user.cards.map((card) => (
                <div
                  key={card.slug}
                  className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3"
                >
                  <div>
                    <span className="text-indigo-200 text-sm">
                      Уровень {card.tier}
                      {card.recipientName && ` → ${card.recipientName}`}
                    </span>
                    <div className="text-indigo-400 text-xs">
                      {card.burnAmountAnn} ANN •{" "}
                      {new Date(card.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        card.status === "OPENED"
                          ? "bg-green-500/20 text-green-300"
                          : "bg-indigo-500/20 text-indigo-300"
                      }`}
                    >
                      {card.status === "OPENED" ? "ОТКРЫТА" : card.status}
                    </span>
                    <Link
                      href={`/card/${card.slug}`}
                      className="text-yellow-300 text-xs hover:underline"
                    >
                      Просмотр
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

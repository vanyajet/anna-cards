"use client";

import { useState, useRef } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  createBurnCheckedInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { useRouter } from "next/navigation";

const ANN_MINT = new PublicKey("2HuiM4qMkZx4wBLnitmuKG1bQgu5g7YF5VnCAL3Mwk9N");
const ANN_DECIMALS = 9;
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

const TIER_AMOUNTS: Record<number, number> = { 1: 100, 2: 500, 3: 1000 };

const BACKGROUNDS_T1 = ["gradient-purple", "gradient-sunset", "gradient-ocean"];
const BACKGROUNDS_T2 = [...BACKGROUNDS_T1, "gradient-forest", "gradient-rose", "gradient-midnight"];

const BG_CLASSES: Record<string, string> = {
  "gradient-purple":   "bg-gradient-to-br from-purple-600 to-indigo-700",
  "gradient-sunset":   "bg-gradient-to-br from-orange-500 to-pink-600",
  "gradient-ocean":    "bg-gradient-to-br from-cyan-500 to-blue-600",
  "gradient-forest":   "bg-gradient-to-br from-green-600 to-emerald-800",
  "gradient-rose":     "bg-gradient-to-br from-rose-400 to-pink-600",
  "gradient-midnight": "bg-gradient-to-br from-gray-900 to-indigo-900",
};

const MUSIC_TRACKS = [
  { id: "track-1", label: "Нежное фортепиано" },
  { id: "track-2", label: "Акустическая гитара" },
  { id: "track-3", label: "Мягкий джаз" },
  { id: "track-4", label: "Энергичный поп" },
];

const EMOJI_OPTIONS = ["🎉", "❤️", "🌟", "🎂", "🥂", "🎁", "💐", "🦋", "✨", "🌈"];

type Mode = "FREE" | "CRYPTO";

// Converts any browser-renderable image (JPEG, PNG, WebP, HEIC on Safari/iOS, etc.)
// to a compressed JPEG File, resized to max 1600px on longest side.
async function compressImage(file: File): Promise<File | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1600;
      let w = img.naturalWidth, h = img.naturalHeight;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else { w = Math.round(w * MAX / h); h = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); resolve(null); return; }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          resolve(blob ? new File([blob], "photo.jpg", { type: "image/jpeg" }) : null);
        },
        "image/jpeg",
        0.85
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

export function CreateWizard({ walletAddress }: { walletAddress: string | null }) {
  const router = useRouter();
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();

  const [mode, setMode] = useState<Mode | null>(null);
  // step 1 = tier (crypto) or details (free), step 2 = details (crypto), step 3 = review
  const [step, setStep] = useState(1);
  const [tier, setTier] = useState<number>(1);
  const [recipientName, setRecipientName] = useState("");
  const [message, setMessage] = useState("");
  const [background, setBackground] = useState(BACKGROUNDS_T1[0]);
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>([]);
  const [musicTrack, setMusicTrack] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const walletMismatch = connected && publicKey && walletAddress && publicKey.toString() !== walletAddress;

  // Both modes now use the same tier state
  const effectiveTier = tier;
  const backgrounds = effectiveTier === 2 ? BACKGROUNDS_T2 : BACKGROUNDS_T1;

  // Both modes: 3 steps — tier → details → review
  const totalSteps = 3;
  const stepLabels = ["Выбор уровня", "Детали открытки", "Проверка и отправка"];

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Accept any image type (JPEG, PNG, WebP, HEIC on Safari/iOS, HEIF, etc.)
    // Reject clearly non-image files
    if (file.type && !file.type.startsWith("image/")) {
      setError("Пожалуйста, выберите файл изображения");
      return;
    }
    // Raw file size guard before processing (20MB max raw)
    if (file.size > 20 * 1024 * 1024) {
      setError("Файл слишком большой. Максимум 20 МБ");
      return;
    }

    setError("");
    try {
      const converted = await compressImage(file);
      if (!converted) {
        // Browser can't render this format (e.g. HEIC on Chrome/Firefox desktop)
        setError("Ваш браузер не может обработать этот формат. Попробуйте JPEG или PNG, либо откройте страницу в Safari.");
        return;
      }
      setPhoto(converted);
      setPhotoPreview(URL.createObjectURL(converted));
    } catch {
      setError("Не удалось загрузить изображение. Попробуйте другой формат.");
    }
  }

  function selectMode(m: Mode) {
    setMode(m);
    setStep(1);
    setTier(1);
    setBackground(BACKGROUNDS_T1[0]);
  }

  async function handleSendFree() {
    setSending(true);
    setError("");
    try {
      let body: FormData | string;
      let headers: Record<string, string> = {};

      if (effectiveTier === 2 && photo) {
        const fd = new FormData();
        fd.append("mode", "FREE");
        fd.append("tier", "2");
        fd.append("recipientName", recipientName);
        fd.append("message", message);
        fd.append("background", background);
        fd.append("emojis", selectedEmojis.join(","));
        fd.append("musicTrack", musicTrack);
        fd.append("photo", photo);
        body = fd;
      } else {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify({
          mode: "FREE",
          tier: 1,
          recipientName,
          message,
          background,
          emojis: selectedEmojis.join(","),
        });
      }

      const res = await fetch("/api/cards/create", { method: "POST", headers, body });
      let data: { error?: string; slug?: string } = {};
      try { data = await res.json(); } catch { /* non-JSON response (e.g. HTML 500/413) */ }
      if (!res.ok) { setError(data.error ?? "Не удалось создать открытку. Попробуйте ещё раз."); return; }
      router.push(`/card/${data.slug}?created=1`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setSending(false);
    }
  }

  async function handleSendCrypto() {
    if (!publicKey) return;
    setSending(true);
    setError("");
    try {
      const burnAmount = TIER_AMOUNTS[tier];
      const burnAmountLamports = BigInt(burnAmount) * BigInt(10 ** ANN_DECIMALS);
      const userAta = await getAssociatedTokenAddress(ANN_MINT, publicKey);

      const burnIx = createBurnCheckedInstruction(
        userAta, ANN_MINT, publicKey, burnAmountLamports, ANN_DECIMALS
      );
      const instructions: TransactionInstruction[] = [burnIx];

      let memoText: string | undefined;
      if (tier === 2) {
        memoText = `From ANN Cards${recipientName ? ` To ${recipientName}` : ""}`;
        instructions.push(new TransactionInstruction({
          programId: MEMO_PROGRAM_ID,
          keys: [],
          data: Buffer.from(memoText, "utf-8"),
        }));
      }

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
      const tx = new Transaction();
      tx.add(...instructions);
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const txSig = await sendTransaction(tx, connection);
      await connection.confirmTransaction({ signature: txSig, blockhash, lastValidBlockHeight }, "confirmed");

      let body: FormData | string;
      let headers: Record<string, string> = {};

      if (tier === 2 && photo) {
        const fd = new FormData();
        fd.append("mode", "CRYPTO");
        fd.append("txSignature", txSig);
        fd.append("tier", String(tier));
        fd.append("recipientName", recipientName);
        fd.append("message", message);
        fd.append("background", background);
        fd.append("emojis", selectedEmojis.join(","));
        fd.append("musicTrack", musicTrack);
        if (memoText) fd.append("memoText", memoText);
        fd.append("photo", photo);
        body = fd;
      } else {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify({ mode: "CRYPTO", txSignature: txSig, tier, recipientName, message, background, emojis: selectedEmojis.join(","), musicTrack });
      }

      const res = await fetch("/api/cards/create", { method: "POST", headers, body });
      let data: { error?: string; slug?: string } = {};
      try { data = await res.json(); } catch { /* non-JSON response (e.g. HTML 500/413) */ }
      if (!res.ok) { setError(data.error ?? "Не удалось создать открытку. Попробуйте ещё раз."); return; }
      router.push(`/card/${data.slug}?created=1`);
    } catch (err: unknown) {
      setError(`Транзакция не удалась: ${err instanceof Error ? err.message : "Неизвестная ошибка"}`);
    } finally {
      setSending(false);
    }
  }

  // ── Mode selection screen ────────────────────────────────────────────────
  if (!mode) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-900 to-blue-900 px-4 py-10">
        <div className="max-w-lg mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2 text-center">Создать открытку</h1>
          <p className="text-indigo-300 text-center mb-10">Выберите способ отправки</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Free mode */}
            <button
              onClick={() => selectMode("FREE")}
              className="group text-left bg-white/10 hover:bg-white/20 border-2 border-white/20 hover:border-white/50 rounded-2xl p-6 transition-all"
            >
              <div className="text-4xl mb-3">🎀</div>
              <div className="text-white font-bold text-lg mb-1">Бесплатно</div>
              <div className="text-indigo-300 text-sm mb-4">Кошелёк не нужен. Просто войдите и отправьте.</div>
              <ul className="text-indigo-200 text-xs space-y-1">
                <li>✓ Личное сообщение</li>
                <li>✓ Красивые фоны</li>
                <li>✓ Фото, эмодзи и музыка</li>
                <li>✓ Открытие подарка</li>
              </ul>
            </button>

            {/* Crypto mode */}
            <button
              onClick={() => selectMode("CRYPTO")}
              className="group text-left bg-yellow-400/10 hover:bg-yellow-400/20 border-2 border-yellow-400/30 hover:border-yellow-400/70 rounded-2xl p-6 transition-all"
            >
              <div className="text-4xl mb-3">🔥</div>
              <div className="text-white font-bold text-lg mb-1">Крипто</div>
              <div className="text-yellow-300 text-sm mb-4">Сожгите токены $ANN. Подтверждено в Solana.</div>
              <ul className="text-yellow-200 text-xs space-y-1">
                <li>✓ Всё из бесплатного</li>
                <li>✓ Доказательство любви в блокчейне</li>
                <li>✓ Значок «Подтверждено в Solana ✓»</li>
                <li>✓ Уровни 100 / 500 / 1000 ANN</li>
              </ul>
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ── Shared card detail fields (used in both modes) ───────────────────────
  const detailsForm = (
    <div className="space-y-5">
      <div>
        <label className="text-indigo-200 text-sm block mb-1">Имя получателя (необязательно)</label>
        <input
          type="text"
          maxLength={100}
          value={recipientName}
          onChange={(e) => setRecipientName(e.target.value)}
          placeholder="Напр. Анна, Папа, Бабушка…"
          className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>

      <div>
        <label className="text-indigo-200 text-sm block mb-1">Сообщение *</label>
        <textarea
          required
          maxLength={2000}
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Напишите ваше искреннее сообщение…"
          className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
        />
      </div>

      {/* Background picker */}
      <div>
        <label className="text-indigo-200 text-sm block mb-2">Фон</label>
        <div className="flex gap-2 flex-wrap">
          {backgrounds.map((bg) => (
            <button
              key={bg}
              onClick={() => setBackground(bg)}
              className={`w-12 h-12 rounded-xl ${BG_CLASSES[bg]} border-2 transition-all ${
                background === bg ? "border-yellow-400 scale-110" : "border-transparent"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Extras: photo / emojis / music — shown for tier 2 in both modes */}
      {effectiveTier === 2 && (
        <>
          <div>
            <label className="text-indigo-200 text-sm block mb-2">Фото (обязательно)</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer border-2 border-dashed border-white/30 rounded-xl p-6 text-center hover:border-white/50 transition-colors"
            >
              {photoPreview ? (
                <img src={photoPreview} alt="preview" className="w-full h-40 object-cover rounded-lg" />
              ) : (
                <>
                  <div className="text-3xl mb-2">📷</div>
                  <p className="text-indigo-300 text-sm">Нажмите для загрузки (JPEG, PNG, WebP — макс. 5 МБ)</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>

          <div>
            <label className="text-indigo-200 text-sm block mb-2">Эмодзи</label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  onClick={() =>
                    setSelectedEmojis((prev) =>
                      prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]
                    )
                  }
                  className={`text-2xl w-10 h-10 rounded-lg border transition-all ${
                    selectedEmojis.includes(e)
                      ? "border-yellow-400 bg-yellow-400/20"
                      : "border-white/20 bg-white/10"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-indigo-200 text-sm block mb-2">Фоновая музыка</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMusicTrack("")}
                className={`py-2 px-3 rounded-xl border text-sm transition-all ${
                  !musicTrack ? "border-yellow-400 bg-yellow-400/10 text-white" : "border-white/20 bg-white/5 text-indigo-300"
                }`}
              >
                Без музыки
              </button>
              {MUSIC_TRACKS.map((track) => (
                <button
                  key={track.id}
                  onClick={() => setMusicTrack(track.id)}
                  className={`py-2 px-3 rounded-xl border text-sm transition-all ${
                    musicTrack === track.id ? "border-yellow-400 bg-yellow-400/10 text-white" : "border-white/20 bg-white/5 text-indigo-300"
                  }`}
                >
                  {track.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );

  // Tier 2 always requires a photo (both modes)
  const canProceedFromDetails =
    message.trim().length > 0 &&
    (effectiveTier !== 2 || photo !== null);

  // ── Wizard ───────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-900 to-blue-900 px-4 py-10">
      <div className="max-w-lg mx-auto">

        {/* Mode badge + change link */}
        <div className="flex items-center gap-3 mb-6">
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
            mode === "FREE" ? "bg-white/20 text-white" : "bg-yellow-400/20 text-yellow-300 border border-yellow-400/40"
          }`}>
            {mode === "FREE" ? "🎀 Бесплатный режим" : "🔥 Крипто-режим"}
          </span>
          <button onClick={() => setMode(null)} className="text-indigo-400 hover:text-white text-xs underline">
            изменить
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-8">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  step >= s ? "bg-yellow-400 text-gray-900" : "bg-white/20 text-indigo-300"
                }`}
              >
                {s}
              </div>
              {s < totalSteps && (
                <div className={`h-1 w-12 rounded ${step > s ? "bg-yellow-400" : "bg-white/20"}`} />
              )}
            </div>
          ))}
          <span className="ml-2 text-indigo-300 text-sm">
            {stepLabels[(step - 1)] ?? ""}
          </span>
        </div>

        {/* ── Step 1 — Tier selection (both modes) ── */}
        {step === 1 && (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-white mb-6">Выберите уровень</h1>
            {mode === "FREE" ? (
              // Free tier options
              [
                { t: 1, emoji: "✉️", label: "Базовый", desc: "Личное сообщение + красивый градиентный фон" },
                { t: 2, emoji: "📸", label: "Полный", desc: "Фото, эмодзи, фоновая музыка + 3D-открытие" },
              ].map(({ t, emoji, label, desc }) => (
                <button
                  key={t}
                  onClick={() => { setTier(t); setBackground(t === 2 ? BACKGROUNDS_T2[0] : BACKGROUNDS_T1[0]); setPhoto(null); setPhotoPreview(null); }}
                  className={`w-full text-left rounded-2xl p-5 border-2 transition-all ${
                    tier === t ? "border-yellow-400 bg-yellow-400/10" : "border-white/20 bg-white/10 hover:border-white/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{emoji}</span>
                    <div>
                      <div className="text-white font-semibold">{label}</div>
                      <div className="text-indigo-300 text-sm">{desc}</div>
                    </div>
                    <span className="ml-auto text-xs bg-white/10 text-indigo-200 rounded-full px-2 py-0.5">Бесплатно</span>
                  </div>
                </button>
              ))
            ) : (
              // Crypto tier options
              [
                { t: 1, emoji: "✉️", label: "Уровень 1 — 100 ANN", desc: "Личное сообщение + градиентный фон" },
                { t: 2, emoji: "📸", label: "Уровень 2 — 500 ANN", desc: "Фото, музыка, эмодзи, 3D-параллакс + памятка в блокчейне" },
                { t: 3, emoji: "🚀", label: "Уровень 3 — 1000 ANN", desc: "Скоро — Выпуск сжатого NFT" },
              ].map(({ t, emoji, label, desc }) => (
                <button
                  key={t}
                  disabled={t === 3}
                  onClick={() => { if (t !== 3) { setTier(t); setBackground(t === 2 ? BACKGROUNDS_T2[0] : BACKGROUNDS_T1[0]); setPhoto(null); setPhotoPreview(null); } }}
                  className={`w-full text-left rounded-2xl p-5 border-2 transition-all ${
                    t === 3 ? "opacity-50 cursor-not-allowed border-white/10 bg-white/5"
                    : tier === t ? "border-yellow-400 bg-yellow-400/10"
                    : "border-white/20 bg-white/10 hover:border-white/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{emoji}</span>
                    <div>
                      <div className="text-white font-semibold">{label}</div>
                      <div className="text-indigo-300 text-sm">{desc}</div>
                    </div>
                    {t === 3 && <span className="ml-auto text-xs bg-indigo-500/30 text-indigo-300 rounded-full px-2 py-0.5">Скоро</span>}
                  </div>
                </button>
              ))
            )}
            <button
              onClick={() => setStep(2)}
              className="w-full mt-4 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold py-3 rounded-xl transition-colors"
            >
              Продолжить
            </button>
          </div>
        )}

        {/* ── Step 2 — Card details ── */}
        {step === 2 && (
          <div className="space-y-5">
            <h1 className="text-2xl font-bold text-white mb-2">Детали открытки</h1>
            {detailsForm}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 border border-white/30 text-white py-3 rounded-xl hover:bg-white/10 transition-colors"
              >
                Назад
              </button>
              <button
                disabled={!canProceedFromDetails}
                onClick={() => setStep(3)}
                className="flex-1 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-gray-900 font-bold py-3 rounded-xl transition-colors"
              >
                Проверить
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3 — Review & Send ── */}
        {step === 3 && (
          <div className="space-y-5">
            <h1 className="text-2xl font-bold text-white mb-2">Проверка и отправка</h1>

            {/* Preview */}
            <div className={`rounded-2xl p-6 ${BG_CLASSES[background]} relative overflow-hidden`}>
              {photoPreview && (
                <div className="mb-4 border-4 border-white shadow-lg p-1 bg-white mx-auto w-fit">
                  <img src={photoPreview} alt="preview" className="w-48 h-48 object-cover" />
                </div>
              )}
              {recipientName && <p className="text-white/80 text-sm mb-1">Кому: {recipientName}</p>}
              <p className="text-white font-medium whitespace-pre-wrap">{message}</p>
              {selectedEmojis.length > 0 && <p className="mt-3 text-2xl">{selectedEmojis.join(" ")}</p>}
            </div>

            {/* Summary */}
            <div className="bg-white/10 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-indigo-300">Режим</span>
                <span className="text-white">{mode === "FREE" ? "🎀 Бесплатно" : "🔥 Крипто"}</span>
              </div>
              {mode === "CRYPTO" && (
                <div className="flex justify-between">
                  <span className="text-indigo-300">ANN сожжено</span>
                  <span className="text-yellow-300 font-semibold">{TIER_AMOUNTS[tier]} ANN</span>
                </div>
              )}
              {musicTrack && (
                <div className="flex justify-between">
                  <span className="text-indigo-300">Музыка</span>
                  <span className="text-white">{MUSIC_TRACKS.find((t) => t.id === musicTrack)?.label}</span>
                </div>
              )}
            </div>

            {/* Crypto-only: wallet checks */}
            {mode === "CRYPTO" && walletMismatch && (
              <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-3 text-red-300 text-sm">
                Несоответствие кошелька! Подключите зарегистрированный кошелёк: {walletAddress?.slice(0, 8)}…
              </div>
            )}
            {mode === "CRYPTO" && !connected && (
              <div className="text-center"><WalletMultiButton /></div>
            )}

            {error && (
              <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-3 text-red-300 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 border border-white/30 text-white py-3 rounded-xl hover:bg-white/10 transition-colors"
              >
                Назад
              </button>
              <button
                disabled={sending || (mode === "CRYPTO" && (!connected || !!walletMismatch))}
                onClick={mode === "FREE" ? handleSendFree : handleSendCrypto}
                className="flex-1 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-gray-900 font-bold py-3 rounded-xl transition-colors"
              >
                {sending
                  ? "Отправка…"
                  : mode === "FREE"
                  ? "Отправить открытку"
                  : `Сжечь ${TIER_AMOUNTS[tier]} ANN и отправить`}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

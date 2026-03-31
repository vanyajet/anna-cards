"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import confetti from "canvas-confetti";
import { useSearchParams } from "next/navigation";

// These drive the full-page background (before and after open)
const PAGE_BG_CLASSES: Record<string, string> = {
  "gradient-purple":   "bg-gradient-to-br from-purple-600 to-indigo-700",
  "gradient-sunset":   "bg-gradient-to-br from-orange-500 to-pink-600",
  "gradient-ocean":    "bg-gradient-to-br from-cyan-500 to-blue-600",
  "gradient-forest":   "bg-gradient-to-br from-green-600 to-emerald-800",
  "gradient-rose":     "bg-gradient-to-br from-rose-400 to-pink-600",
  "gradient-midnight": "bg-gradient-to-br from-gray-900 to-indigo-900",
};

// Accent colour for text / borders that sit on the gradient background
const ACCENT_TEXT: Record<string, string> = {
  "gradient-purple":   "text-indigo-100",
  "gradient-sunset":   "text-orange-50",
  "gradient-ocean":    "text-cyan-50",
  "gradient-forest":   "text-emerald-50",
  "gradient-rose":     "text-rose-50",
  "gradient-midnight": "text-indigo-200",
};

type Card = {
  slug: string;
  mode: string;
  tier: number;
  recipientName: string | null;
  message: string;
  background: string;
  emojis: string | null;
  photoUrl: string | null;
  musicTrack: string | null;
  memoText: string | null;
  burnTxSig: string | null;
  burnAmountAnn: number;
  openedAt: Date | string | null;
  status: string;
};

export function CardReveal({ card }: { card: Card }) {
  const searchParams = useSearchParams();
  const isCreator = searchParams.get("created") === "1";
  const [opened, setOpened] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 3D tilt motion values for Tier 2
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-150, 150], [12, -12]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(mouseX, [-150, 150], [-12, 12]), { stiffness: 300, damping: 30 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (card.tier !== 2) return;
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - (rect.left + rect.width / 2));
    mouseY.set(e.clientY - (rect.top + rect.height / 2));
  }

  function handleMouseLeave() {
    mouseX.set(0);
    mouseY.set(0);
  }

  async function handleOpen() {
    if (opened) return;

    confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 },
      colors: ["#FFD700", "#FF69B4", "#87CEEB", "#98FB98", "#DDA0DD"] });

    if (card.tier >= 2) {
      setTimeout(() => {
        confetti({ particleCount: 80, angle: 60, spread: 60, origin: { x: 0 } });
        confetti({ particleCount: 80, angle: 120, spread: 60, origin: { x: 1 } });
      }, 300);
    }

    if (card.musicTrack && card.tier >= 2) {
      try {
        const audio = new Audio(`/audio/${card.musicTrack}.mp3`);
        audio.loop = true;
        audio.volume = 0.5;
        audioRef.current = audio;
        await audio.play();
      } catch { /* blocked by autoplay policy — user can toggle */ }
    }

    setOpened(true);
    fetch(`/api/cards/${card.slug}/open`, { method: "PATCH" }).catch(() => {});
  }

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  const pageBg  = PAGE_BG_CLASSES[card.background] ?? PAGE_BG_CLASSES["gradient-purple"];
  const accent  = ACCENT_TEXT[card.background]     ?? ACCENT_TEXT["gradient-purple"];
  const emojiList = card.emojis?.split(",").filter(Boolean) ?? [];

  return (
    <main className={`min-h-screen ${pageBg} flex flex-col items-center justify-center px-4 py-10 transition-all duration-700`}>

      {/* Share banner for creator */}
      {isCreator && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 bg-black/20 backdrop-blur border border-white/20 rounded-2xl px-6 py-4 text-center max-w-md"
        >
          <p className="text-white font-semibold">Ваша открытка готова!</p>
          <p className="text-white/70 text-sm mt-1">Поделитесь ссылкой с получателем:</p>
          <button
            onClick={() => navigator.clipboard.writeText(window.location.href.split("?")[0])}
            className="mt-3 bg-white/20 hover:bg-white/30 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer border border-white/30"
          >
            Скопировать ссылку
          </button>
        </motion.div>
      )}

      {!opened ? (
        /* Gift box */
        <div className="text-center">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`text-lg mb-4 ${accent}`}
          >
            {card.recipientName
              ? <>Открытка ждёт вас, <span className="text-white font-semibold">{card.recipientName}</span></>
              : "Открытка ждёт вас"}
          </motion.p>

          <motion.button
            onClick={handleOpen}
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="text-8xl cursor-pointer select-none filter drop-shadow-2xl"
            aria-label="Open card"
          >
            🎁
          </motion.button>

          <p className={`mt-6 text-sm ${accent} opacity-75`}>Нажмите, чтобы открыть</p>
        </div>
      ) : (
        /* Postcard */
        <motion.div
          initial={{ opacity: 0, scale: 0.6, rotateY: -20 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={card.tier === 2 ? { rotateX, rotateY, transformStyle: "preserve-3d" } : {}}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="bg-[#faf6f0] rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden"
        >
          {/* Thin coloured top stripe matching the chosen gradient */}
          <div className={`h-2 w-full ${pageBg}`} />

          <div className="p-8">
            {/* Solana verification badge — only for CRYPTO mode cards */}
            {card.mode === "CRYPTO" && card.burnTxSig && (
              <a
                href={`https://explorer.solana.com/tx/${card.burnTxSig}`}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute top-5 right-4 bg-emerald-50 border border-emerald-300 text-emerald-700 text-xs px-3 py-1 rounded-full hover:bg-emerald-100 transition-colors"
              >
                Подтверждено в Solana ✓
              </a>
            )}

            {/* Polaroid photo */}
            {card.photoUrl && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-6 mx-auto w-fit"
              >
                <div className="bg-white p-2 pb-8 shadow-lg rotate-1 hover:rotate-0 transition-transform duration-300">
                  <img
                    src={card.photoUrl}
                    alt="card photo"
                    className="w-56 h-56 object-cover"
                  />
                </div>
              </motion.div>
            )}

            {card.recipientName && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-stone-400 text-sm mb-2 font-medium"
              >
                Кому: {card.recipientName}
              </motion.p>
            )}

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-stone-800 text-lg leading-relaxed whitespace-pre-wrap font-medium"
            >
              {card.message}
            </motion.p>

            {emojiList.length > 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="mt-4 text-3xl"
              >
                {emojiList.join(" ")}
              </motion.p>
            )}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="mt-6 pt-4 border-t border-stone-200 flex items-center justify-between text-xs text-stone-400"
            >
              <span>{card.mode === "CRYPTO" ? `${card.burnAmountAnn} ANN сожжено` : "Бесплатная открытка"}</span>
              <span>Уровень {card.tier}</span>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Music control */}
      {opened && card.musicTrack && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-6 flex items-center gap-3"
        >
          <span className={`text-sm ${accent} opacity-80`}>🎵 Фоновая музыка играет</span>
          <button
            onClick={() => {
              if (!audioRef.current) return;
              if (audioRef.current.paused) {
                audioRef.current.play();
              } else {
                audioRef.current.pause();
              }
            }}
            className="text-white/60 hover:text-white text-xs underline"
          >
            Вкл/Выкл
          </button>
        </motion.div>
      )}

      {/* Bottom CTAs */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: opened ? 1.2 : 0.5 }}
        className="mt-10 flex flex-col sm:flex-row items-center gap-3"
      >
        <a
          href="/create"
          className="bg-white/20 hover:bg-white/30 backdrop-blur text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-colors border border-white/30"
        >
          + Создать свою открытку
        </a>
        <a
          href="/dashboard"
          className="text-white/60 hover:text-white text-sm px-4 py-2.5 rounded-xl border border-white/20 hover:border-white/40 transition-colors"
        >
          Мои открытки
        </a>
      </motion.div>
    </main>
  );
}

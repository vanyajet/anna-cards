import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-900 to-blue-900 flex flex-col items-center pt-20 pb-16 px-4">
      {/* Hero Section */}
      <div className="text-center max-w-3xl w-full">
        <div className="text-6xl mb-6 animate-bounce">🎁</div>
        <h1 className="text-4xl sm:text-6xl font-extrabold text-white mb-6 leading-tight">
          Подарите эмоции с <br />
          <span className="text-yellow-400 bg-clip-text">Anna Cards</span>
        </h1>

        {/* Эмоциональный блок (Твоя идея) */}
        <div className="bg-white/5 backdrop-blur-md border border-indigo-300/20 rounded-3xl p-6 sm:p-8 mb-10 shadow-xl">
          <p className="text-lg sm:text-xl text-indigo-100 leading-relaxed font-medium">
            Хотите сказать что-то важное близкому человеку, поздравить его или
            просто заставить улыбнуться?
          </p>
          <p className="text-indigo-200 mt-4 text-base sm:text-lg">
            Просто создайте интерактивную открытку: напишите теплые слова,
            прикрепите памятное фото и выберите фоновую музыку. Мы упакуем всё
            это в виртуальную подарочную коробочку. Отправьте ссылку — и
            получатель увидит волшебное раскрытие вашего сюрприза с конфетти!
          </p>
        </div>

        <Link
          href="/auth/signin"
          className="inline-block bg-yellow-400 hover:bg-yellow-300 hover:scale-105 text-gray-900 font-bold text-lg px-12 py-4 rounded-2xl shadow-[0_0_20px_rgba(250,204,21,0.4)] transition-all duration-300"
        >
          Создать открытку
        </Link>
      </div>

      {/* Описание режимов (Для мамы vs Для криптанов) */}
      <div className="mt-20 text-center max-w-2xl">
        <h2 className="text-2xl font-bold text-white mb-4">Доступно каждому</h2>
        <p className="text-indigo-200 text-sm sm:text-base">
          Платформа работает в двух режимах. Вы можете создать открытку{" "}
          <b>абсолютно бесплатно</b> (идеально для друзей и семьи). А для
          крипто-энтузиастов есть Web3-режим: оплата токенами{" "}
          <span className="text-yellow-300">$ANN</span> и вечная запись вашего
          поздравления в блокчейне Solana.
        </p>
      </div>

      {/* Tier Cards (Уровни) */}
      <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl w-full px-4">
        {[
          {
            tier: 1,
            price: "Бесплатно / 100 ANN",
            emoji: "✉️",
            label: "Теплые слова",
            perks: [
              "Личное сообщение",
              "Красивые градиенты",
              "Анимация конфетти",
            ],
            highlight: false,
          },
          {
            tier: 2,
            price: "Бесплатно / 500 ANN",
            emoji: "📸",
            label: "Ожившие воспоминания",
            perks: [
              "Загрузка вашего фото",
              "Фоновая музыка",
              "3D-эффект карточки",
              "Эмодзи и стилизация",
              "Запись в блокчейн (для Web3)",
            ],
            highlight: true,
          },
          {
            tier: 3,
            price: "1000 ANN",
            emoji: "🚀",
            label: "Вечность (Скоро)",
            perks: [
              "Выпуск открытки как NFT",
              "Отправка прямо в кошелек",
              "Уникальный дизайн",
            ],
            highlight: false,
          },
        ].map((t) => (
          <div
            key={t.tier}
            className={`backdrop-blur-sm border rounded-3xl p-6 text-white transition-transform hover:-translate-y-1 ${
              t.highlight
                ? "bg-indigo-600/30 border-yellow-400/50 shadow-lg shadow-indigo-900/50"
                : "bg-white/5 border-white/10"
            }`}
          >
            <div className="text-4xl mb-3">{t.emoji}</div>
            <div className="font-bold text-xl mb-1">{t.label}</div>
            <div className="text-yellow-300 font-medium text-sm mb-5">
              {t.price}
            </div>
            <ul className="text-sm text-indigo-100 space-y-2">
              {t.perks.map((p) => (
                <li key={p} className="flex items-start">
                  <span className="mr-2 text-yellow-400">✧</span> {p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="mt-20 text-indigo-400/60 text-xs sm:text-sm text-center">
        Сделано с любовью. <br className="sm:hidden" />
        Web3 функционал работает на{" "}
        <span className="text-indigo-300/80 font-medium">
          Anniversary Coin ($ANN)
        </span>{" "}
        в сети Solana.
      </footer>
    </main>
  );
}

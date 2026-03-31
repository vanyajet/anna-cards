export default function VerifyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-900 to-blue-900 flex items-center justify-center px-4">
      <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-8 w-full max-w-md text-center text-white">
        <div className="text-5xl mb-4">📬</div>
        <h1 className="text-2xl font-bold mb-2">Проверьте почту</h1>
        <p className="text-indigo-300">
          Магическая ссылка отправлена на вашу почту. Нажмите на неё, чтобы войти.
        </p>
      </div>
    </main>
  );
}

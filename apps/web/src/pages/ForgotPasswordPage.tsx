import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitted(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4">
      <div className="w-full max-w-md rounded-2xl bg-[#141414] p-8 shadow-2xl border border-white/5">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Recuperar acesso</h1>
          <p className="text-gray-400">Enviaremos um link para o seu email</p>
        </div>

        {isSubmitted ? (
          <div className="text-center">
            <div className="mb-6 rounded-lg bg-[#f59e0b]/10 p-4 text-[#f59e0b] border border-[#f59e0b]/20">
              Se existir uma conta associada a este email, receberá instruções em breve.
            </div>
            <Link to="/login" replace className="text-[#f59e0b] font-semibold hover:underline">
              Voltar ao login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input
                type="email"
                required
                className="w-full rounded-lg bg-[#1a1a1a] border border-white/10 p-3 text-white focus:border-[#f59e0b] focus:outline-none transition-colors"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-[#f59e0b] p-3 font-semibold text-black hover:bg-[#d97706] transition-colors"
            >
              Enviar link
            </button>

            <p className="text-center text-sm text-gray-400">
              <Link to="/login" replace className="hover:underline">
                Voltar ao login
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

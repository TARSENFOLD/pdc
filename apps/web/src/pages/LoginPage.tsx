import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.body?.error || 'Erro ao iniciar sessão. Verifique as suas credenciais.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4">
      <div className="w-full max-w-md rounded-2xl bg-[#141414] p-8 shadow-2xl border border-white/5">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Bem-vindo</h1>
          <p className="text-gray-400">Inicie sessão para continuar no PDC</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20">
              {error}
            </div>
          )}

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

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-300">Palavra-passe</label>
              <Link to="/forgot-password" replace className="text-sm text-[#f59e0b] hover:underline">
                Esqueceu-se?
              </Link>
            </div>
            <input
              type="password"
              required
              className="w-full rounded-lg bg-[#1a1a1a] border border-white/10 p-3 text-white focus:border-[#f59e0b] focus:outline-none transition-colors"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-[#f59e0b] p-3 font-semibold text-black hover:bg-[#d97706] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'A carregar...' : 'Entrar'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-400">
          Não tem uma conta?{' '}
          <Link to="/register" replace className="text-[#f59e0b] font-semibold hover:underline">
            Registe-se
          </Link>
        </p>
      </div>
    </div>
  );
}

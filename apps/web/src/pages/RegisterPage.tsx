import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth/AuthContext';
import { authApi } from '@/lib/api/auth';

export default function RegisterPage() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await register({ nome, email, password });
      // Redirect to OTP verification
      navigate('/verificar', { state: { canal: result.canal, from: '/dashboard' }, replace: true });
    } catch (err: unknown) {
      const body = err instanceof Error && 'body' in err ? (err as { body?: Record<string, string> }).body : undefined;
      setError(body?.error ?? 'Erro ao criar conta. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4">
      <div className="w-full max-w-md rounded-2xl bg-[#141414] p-8 shadow-2xl border border-white/5">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Criar conta</h1>
          <p className="text-gray-400">Junte-se ao Por Dentro do Curso</p>
        </div>

        <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-6">
          {error && (
            <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Nome completo</label>
            <input
              type="text"
              required
              className="w-full rounded-lg bg-[#1a1a1a] border border-white/10 p-3 text-white focus:border-[#f59e0b] focus:outline-none transition-colors"
              placeholder="Seu nome"
              value={nome}
              onChange={(e) => { setNome(e.target.value); }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
            <input
              type="email"
              required
              className="w-full rounded-lg bg-[#1a1a1a] border border-white/10 p-3 text-white focus:border-[#f59e0b] focus:outline-none transition-colors"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Palavra-passe</label>
            <input
              type="password"
              required
              className="w-full rounded-lg bg-[#1a1a1a] border border-white/10 p-3 text-white focus:border-[#f59e0b] focus:outline-none transition-colors"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => { setPassword(e.target.value); }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-[#f59e0b] p-3 font-semibold text-black hover:bg-[#d97706] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'A carregar...' : 'Criar conta'}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-[#141414] px-2 text-gray-400">ou</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => { authApi.loginWithGoogle(); }}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-lg border border-white/10 bg-[#1a1a1a] p-3 font-medium text-white transition-colors hover:bg-white/5"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path
                d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z"
                fill="#EA4335"
              />
              <path
                d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z"
                fill="#4285F4"
              />
              <path
                d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z"
                fill="#FBBC05"
              />
              <path
                d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.87037 19.245 6.21537 17.135 5.26538 14.29L1.27539 17.385C3.25539 21.31 7.31037 24.0001 12.0004 24.0001Z"
                fill="#34A853"
              />
            </svg>
            Continuar com Google
          </button>
        </div>

        <p className="mt-8 text-center text-sm text-gray-400">
          Já tem uma conta?{' '}
          <Link to="/login" replace className="text-[#f59e0b] font-semibold hover:underline">
            Inicie sessão
          </Link>
        </p>
      </div>
    </div>
  );
}

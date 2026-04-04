import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth/AuthContext';

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
      await register({ nome, email, password });
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.body?.error || 'Erro ao criar conta. Tente novamente.');
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

        <form onSubmit={handleSubmit} className="space-y-6">
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
              onChange={(e) => setNome(e.target.value)}
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
              onChange={(e) => setEmail(e.target.value)}
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
              onChange={(e) => setPassword(e.target.value)}
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

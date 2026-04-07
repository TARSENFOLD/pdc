import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth/AuthContext';
import { authApi } from '@/lib/api/auth';
import { Input, Button } from '@/components/ui';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/dashboard';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login({ email, password });
      if ('requiresOtp' in result) {
        navigate('/verificar', { state: { canal: result.canal, from }, replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err: unknown) {
      const body = err instanceof Error && 'body' in err ? (err as { body?: Record<string, string> }).body : undefined;
      setError(body?.error ?? 'Erro ao iniciar sessão. Verifique as suas credenciais.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl bg-surface p-8 shadow-2xl border border-border">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Bem-vindo</h1>
          <p className="text-text-muted">Inicie sessão para continuar no PDC</p>
        </div>

        <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-6">
          {error && (
            <div className="rounded-lg bg-error/10 p-3 text-sm text-error border border-error/20">
              {error}
            </div>
          )}

          <Input 
            label="Email" 
            type="email"
            required
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); }}
            className="bg-surface-raised border-border focus:border-amber"
          />

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-text-secondary">Palavra-passe</label>
              <Link to="/forgot-password" replace className="text-sm text-amber hover:underline">
                Esqueceu-se?
              </Link>
            </div>
            <Input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => { setPassword(e.target.value); }}
              className="bg-surface-raised border-border focus:border-amber"
            />
          </div>

          <Button
            type="submit"
            isLoading={isLoading}
            className="w-full bg-amber text-black hover:bg-amber-hover transition-colors"
          >
            Entrar
          </Button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-surface px-2 text-text-muted">ou</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => { authApi.loginWithGoogle(); }}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-surface-raised p-3 font-medium text-text-primary transition-colors hover:bg-surface-raised"
          >
            Continuar com Google
          </button>
        </div>

        <p className="mt-8 text-center text-sm text-text-muted">
          Não tem uma conta?{' '}
          <Link to="/criar-conta" replace className="text-amber font-semibold hover:underline">
            Registe-se
          </Link>
        </p>
      </div>
    </div>
  );
}

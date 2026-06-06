import { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { AuthLeftPanel } from '@/components/auth/AuthLeftPanel';
import { AsymmetricButton, PasswordInput } from '@/components/ui';
import { authApi } from '@/lib/api/auth';
import { getErrorBody } from '@/lib/api/http';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState('');

  if (!token) return <Navigate to="/forgot-password" replace />;
  const resetToken = token;

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setError('');
    if (password.length < 12) {
      setError('A palavra-passe deve ter pelo menos 12 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As palavras-passe não coincidem.');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.resetPassword(resetToken, password);
      setIsComplete(true);
    } catch (err: unknown) {
      setError(getErrorBody(err)?.error ?? 'O link é inválido ou expirou.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-canvas font-sans">
      <div className="hidden lg:block">
        <AuthLeftPanel
          headline="Nova palavra-passe"
          subline="Protege a tua identidade com uma credencial forte e exclusiva."
        />
      </div>
      <div className="flex min-h-screen items-center justify-center p-8 lg:ml-[50%] lg:p-12">
        <div className="w-full max-w-sm">
          <header className="mb-10">
            <h1 className="mb-2 font-display text-5xl font-black tracking-tight text-ink-primary">
              Redefinir acesso
            </h1>
            <p className="font-medium text-ink-secondary">Cria uma nova palavra-passe para a tua conta.</p>
          </header>

          {isComplete ? (
            <div className="space-y-6">
              <div role="status" className="rounded-xl border border-accent/20 bg-accent/10 p-5 text-sm font-medium text-accent">
                Palavra-passe alterada com sucesso.
              </div>
              <Link to="/login" replace className="block text-center text-sm font-bold text-accent hover:underline">
                Entrar na plataforma
              </Link>
            </div>
          ) : (
            <form onSubmit={(event) => { void handleSubmit(event); }} className="space-y-6">
              {error && (
                <div role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm font-medium text-red-500">
                  {error}
                </div>
              )}
              <PasswordInput
                id="reset-password"
                label="Nova palavra-passe"
                autoComplete="new-password"
                minLength={12}
                required
                value={password}
                onChange={(event) => { setPassword(event.target.value); }}
              />
              <PasswordInput
                id="reset-password-confirm"
                label="Confirmar palavra-passe"
                autoComplete="new-password"
                minLength={12}
                required
                value={confirmPassword}
                onChange={(event) => { setConfirmPassword(event.target.value); }}
              />
              <AsymmetricButton
                type="submit"
                disabled={isLoading}
                className="h-14 w-full bg-ink-primary text-[11px] font-black uppercase tracking-widest text-canvas shadow-xl transition-all hover:bg-accent hover:text-ink-on-accent"
              >
                {isLoading ? 'A alterar...' : 'Alterar palavra-passe'}
              </AsymmetricButton>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

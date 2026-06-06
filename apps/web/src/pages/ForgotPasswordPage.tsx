import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthLeftPanel } from '@/components/auth/AuthLeftPanel';
import { AsymmetricButton } from '@/components/ui';
import { authApi } from '@/lib/api/auth';
import { getErrorBody } from '@/lib/api/http';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Email inválido');
      return;
    }
    setIsLoading(true);
    try {
      await authApi.forgotPassword(email);
      setIsSubmitted(true);
    } catch (err: unknown) {
      setError(getErrorBody(err)?.error ?? 'Não foi possível enviar o email. Tenta novamente.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-canvas font-sans">
      {/* Left: fixed neural panel */}
      <div className="hidden lg:block">
        <AuthLeftPanel
          headline="Recuperar o Acesso"
          subline="Vamos repor a tua ligação ao universo académico."
        />
      </div>

      {/* Right: form — offset by 50% to clear the fixed left panel */}
      <div className="flex items-center justify-center p-8 lg:p-12 min-h-screen lg:ml-[50%]">
        <div className="w-full max-w-sm">
          <header className="mb-12">
            <h1 className="text-5xl font-black text-ink-primary tracking-tight mb-2 font-display">
              Recuperar acesso
            </h1>
            <p className="text-ink-secondary font-medium">
              Enviaremos um link para o teu email.
            </p>
          </header>

          {isSubmitted ? (
            <div className="space-y-6">
              <div role="status" className="rounded-xl bg-accent/10 p-5 font-medium text-sm text-accent border border-accent/20">
                Sucesso: email enviado. Se existir uma conta associada a este email, receberás instruções em breve.
              </div>
              <Link
                to="/login"
                replace
                className="block text-center text-sm font-bold text-ink-tertiary hover:text-ink-primary transition-colors"
              >
                ← Voltar ao login
              </Link>
            </div>
          ) : (
            <form onSubmit={(event) => { void handleSubmit(event); }} noValidate className="space-y-6">
              {error && (
                <div role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm font-medium text-red-500">
                  {error}
                </div>
              )}
              <div>
                <label htmlFor="recovery-email" className="block text-xs font-bold text-ink-tertiary uppercase tracking-widest mb-2">
                  Email
                </label>
                <input
                  id="recovery-email"
                  name="email"
                  type="email"
                  placeholder="nome@exemplo.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); }}
                  className="w-full p-4 bg-recessed border border-ink-tertiary/10 rounded-xl text-base text-ink-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all placeholder:text-ink-tertiary touch-target"
                />
              </div>

              <AsymmetricButton
                type="submit"
                disabled={isLoading}
                className="w-full h-14 bg-ink-primary text-canvas font-black uppercase tracking-widest text-[11px] hover:bg-accent hover:text-ink-on-accent transition-all shadow-xl"
              >
                {isLoading ? 'A enviar...' : 'Enviar link'}
              </AsymmetricButton>

              <p className="text-center text-sm text-ink-tertiary font-medium">
                <Link to="/login" replace className="hover:text-ink-primary transition-colors">
                  ← Voltar ao login
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom';

import { useAuth } from '@/lib/auth/AuthContext';
import { authApi } from '@/lib/api/auth';
import { useTelemetry } from '@/hooks/useTelemetry';
import { AsymmetricButton } from '@/components/ui';
import { useTranslation } from '@/hooks/useTranslation';
import { AuthLeftPanel } from '@/components/auth/AuthLeftPanel';
import type { NeuralState } from '@/components/auth/NeuralConstellation';

function getErrorStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  if ('status' in error && typeof error.status === 'number') return error.status;
  if ('response' in error) {
    const response = error.response;
    if (typeof response === 'object' && response !== null && 'status' in response && typeof response.status === 'number') {
      return response.status;
    }
  }
  return undefined;
}

function getErrorBody(error: unknown): { error?: string } | undefined {
  if (typeof error !== 'object' || error === null || !('body' in error)) return undefined;
  const body = error.body;
  if (typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string') {
    return { error: body.error };
  }
  return undefined;
}

export default function LoginPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const { t } = useTranslation('common');

  const [neuralState, setNeuralState] = useState<NeuralState>('idle');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login, logout, user, isLoading: isAuthLoading } = useAuth();
  const { track } = useTelemetry();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/app';

  const handleWarpComplete = useCallback(() => {
    navigate(from, { replace: true });
  }, [from, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login({ email, password });
      if ('requiresOtp' in result) {
        navigate('/verificar', { state: { canal: result.canal, from }, replace: true });
      } else {
        track('login.success');
        setNeuralState('warp');
        // navigation happens via onWarpComplete
      }
    } catch (err: unknown) {
      const status = getErrorStatus(err);
      if (status === 401) void logout();
      const body = getErrorBody(err);
      setError(body?.error ?? t('auth.login_page.error_generic'));
      setNeuralState('scatter');
      setTimeout(() => { setNeuralState('idle'); }, 2200);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && neuralState !== 'warp') {
      navigate(from, { replace: true });
    }
  }, [from, navigate, neuralState, user]);

  if (!isAuthLoading && user && neuralState !== 'warp') {
    return <Navigate to={from} replace />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen bg-canvas font-sans">
      {/* Left: sticky neural panel */}
      <div className="hidden lg:block">
        <AuthLeftPanel
          neuralState={neuralState}
          onWarpComplete={handleWarpComplete}
          headline="Por Dentro do Curso"
          subline="O universo académico inteiro, à tua medida."
        />
      </div>

      {/* Right: login form */}
      <div className="flex items-center justify-center p-8 lg:p-12 min-h-screen">
        <div className="w-full max-w-sm">
          <header className="mb-12">
            <h1 className="text-5xl font-black text-ink-primary tracking-tight mb-2 font-display">
              {t('auth.login_page.title')}
            </h1>
            <p className="text-ink-secondary font-medium">{t('auth.login_page.subtitle')}</p>
          </header>

          {error && (
            <div role="alert" data-testid="error" className="rounded-lg bg-red-500/10 p-4 font-medium text-sm text-red-500 border border-red-500/20 mb-6 backdrop-blur-md">
              {error}
            </div>
          )}

          <form ref={formRef} onSubmit={(e) => { void handleSubmit(e); }} className="space-y-6">
            <div>
              <label htmlFor="login-email" className="block text-xs font-bold text-ink-tertiary uppercase tracking-widest mb-2">
                {t('auth.login_page.email_label')}
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                aria-label="Email"
                required
                value={email}
                onChange={(e) => { setEmail(e.target.value); }}
                onFocus={() => { setNeuralState('align'); }}
                onBlur={() => { if (neuralState === 'align') setNeuralState('idle'); }}
                placeholder="nome@exemplo.com"
                className="w-full p-4 bg-recessed border border-ink-tertiary/10 rounded-xl text-base text-ink-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all placeholder:text-ink-tertiary touch-target"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-bold text-ink-tertiary uppercase tracking-widest mb-2">
                {t('auth.login_page.password_label')}
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                aria-label="Password"
                required
                value={password}
                onChange={(e) => { setPassword(e.target.value); }}
                onFocus={() => { setNeuralState('encrypt'); }}
                onBlur={() => { if (neuralState === 'encrypt') setNeuralState('idle'); }}
                placeholder="••••••••"
                className="w-full p-4 bg-recessed border border-ink-tertiary/10 rounded-xl text-base text-ink-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all placeholder:text-ink-tertiary touch-target"
              />
            </div>

            <AsymmetricButton
              type="submit"
              aria-label="Entrar"
              disabled={isLoading}
              className="w-full h-14 bg-ink-primary text-canvas font-black uppercase tracking-widest text-[11px] hover:bg-accent hover:text-ink-on-accent transition-all shadow-xl"
            >
              {isLoading ? t('auth.login_page.submit_loading') : t('auth.login_page.submit')}
            </AsymmetricButton>

            <div className="mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-ink-tertiary/10" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-canvas px-4 text-ink-tertiary font-mono tracking-widest text-xs uppercase">
                    {t('auth.login_page.divider')}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => { authApi.loginWithGoogle(); }}
                className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-ink-tertiary/10 bg-recessed p-4 font-bold text-ink-primary transition-colors hover:bg-ink-tertiary/10 active:scale-[0.98] touch-target"
              >
                {t('auth.login_page.google_cta')}
              </button>
              <button
                type="button"
                disabled
                className="mt-3 flex w-full items-center justify-center gap-3 rounded-xl border border-ink-tertiary/10 bg-recessed p-4 font-bold text-ink-secondary transition-colors opacity-70 touch-target"
              >
                LinkedIn
              </button>
            </div>
          </form>

          <footer className="mt-12 pt-8 border-t border-ink-tertiary/10 flex flex-col gap-4 sm:flex-row sm:justify-between text-sm text-ink-tertiary font-medium">
            <Link to="/auth/recuperar" replace className="hover:text-ink-primary transition-colors">
              Recuperar password
            </Link>
            <Link to="/criar-conta" replace className="hover:text-ink-primary transition-colors">
              {t('auth.login_page.register_link')}
            </Link>
          </footer>
        </div>
      </div>
    </div>
  );
}

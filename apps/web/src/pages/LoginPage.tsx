import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '@/lib/auth/auth-context';
import { authApi } from '@/lib/api/auth';
import { useTelemetry } from '@/hooks/useTelemetry';
import { AsymmetricButton, PasswordInput } from '@/components/ui';
import { useTranslation } from '@/hooks/useTranslation';
import { AuthLeftPanel } from '@/components/auth/AuthLeftPanel';
import type { NeuralState } from '@/components/auth/NeuralConstellation';

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
  const [searchParams] = useSearchParams();

  const [neuralState, setNeuralState] = useState<NeuralState>('idle');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scatterTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { login, user, isLoading: isAuthLoading } = useAuth();
  const { track } = useTelemetry();
  const navigate = useNavigate();
  const from = '/app';
  const oauthError = searchParams.get('error');

  const handleWarpComplete = useCallback(() => {
    navigate(from, { replace: true });
  }, [from, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login({ email: email.trim().toLowerCase(), password });
      if ('requiresOtp' in result) {
        navigate('/verificar', { state: { canal: result.canal, from }, replace: true });
      } else {
        track('login.success');
        setNeuralState('warp');
        // navigation happens via onWarpComplete
      }
    } catch (err: unknown) {
      const body = getErrorBody(err);
      setError(body?.error ?? t('auth.login_page.error_generic'));
      setNeuralState('scatter');
      scatterTimeoutRef.current = setTimeout(() => { setNeuralState('idle'); }, 2200);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (scatterTimeoutRef.current !== null) {
        clearTimeout(scatterTimeoutRef.current);
      }
    }
  }, []);

  useEffect(() => {
    if (oauthError === 'oauth_unavailable') {
      setError('Não foi possível concluir a autenticação externa. Tenta novamente dentro de instantes.');
    }
  }, [oauthError]);

  if (!isAuthLoading && user && neuralState !== 'warp') {
    return <Navigate to={from} replace />;
  }

  return (
    <div className="relative min-h-screen bg-canvas font-sans">
      {/* Left: fixed neural panel */}
      <div className="hidden lg:block">
        <AuthLeftPanel
          neuralState={neuralState}
          onWarpComplete={handleWarpComplete}
          headline={t('auth.login_page.panel_headline')}
          subline={t('auth.login_page.panel_subline')}
        />
      </div>

      {/* Right: scrollable form — offset by 50% to clear the fixed left panel */}
      <div className="flex items-center justify-center p-8 lg:p-12 min-h-screen lg:ml-[50%]">
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

            <PasswordInput
                id="login-password"
                name="password"
                label={t('auth.login_page.password_label')}
                aria-label="Palavra-passe"
                required
                value={password}
                onChange={(e) => { setPassword(e.target.value); }}
                onFocus={() => { setNeuralState('encrypt'); }}
                onBlur={() => { if (neuralState === 'encrypt') setNeuralState('idle'); }}
                placeholder="••••••••"
              />

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
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                  <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                {t('auth.login_page.google_cta')}
              </button>
              <button
                type="button"
                onClick={() => { authApi.loginWithLinkedIn(); }}
                className="mt-3 flex w-full items-center justify-center gap-3 rounded-xl border border-ink-tertiary/10 bg-recessed p-4 font-bold text-ink-primary transition-colors hover:bg-ink-tertiary/10 active:scale-[0.98] touch-target"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="#0A66C2">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                {t('auth.login_page.linkedin_cta')}
              </button>
            </div>
          </form>

          <footer className="mt-12 pt-8 border-t border-ink-tertiary/10 flex flex-col gap-4 sm:flex-row sm:justify-between text-sm text-ink-tertiary font-medium">
            <Link to="/auth/recuperar" replace className="hover:text-ink-primary transition-colors">
              {t('auth.login_page.recover_password_link')}
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

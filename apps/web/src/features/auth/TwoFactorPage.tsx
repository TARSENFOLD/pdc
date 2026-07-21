import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth/auth-context';
import { authApi } from '@/lib/api/auth';
import { RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui';
import { AuthLeftPanel } from '@/components/auth/AuthLeftPanel';
import { getErrorBody } from '@/lib/api/http';

function verificationState(value: unknown): {
  canal?: 'email' | 'sms';
  from?: string;
} | null {
  if (typeof value !== 'object' || value === null) return null;
  const canal = 'canal' in value && (value.canal === 'email' || value.canal === 'sms')
    ? value.canal
    : undefined;
  const from = 'from' in value && typeof value.from === 'string' ? value.from : undefined;
  return { ...(canal ? { canal } : {}), ...(from ? { from } : {}) };
}

export default function TwoFactorPage() {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [trustDevice, setTrustDevice] = useState(false);

  const { completeOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = verificationState(location.state);
  const canal = state?.canal ?? 'email';
  const from = state?.from ?? '/app';

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (countdown > 0) {
      timer = setTimeout(() => { setCountdown(countdown - 1); }, 1000);
    }
    return () => { clearTimeout(timer); };
  }, [countdown]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('O código deve ter 6 dígitos.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      await completeOtp(otp, canal, trustDevice);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const body = getErrorBody(err);
      setError(body?.error ?? 'Código inválido ou expirado.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResend() {
    if (countdown > 0) return;

    setIsResending(true);
    setError('');
    setResendSuccess(false);

    try {
      await authApi.sendOtp(canal);
      setResendSuccess(true);
      setCountdown(60);
      setTimeout(() => { setResendSuccess(false); }, 5000);
    } catch (err: unknown) {
      const body = getErrorBody(err);
      setError(body?.error ?? 'Erro ao reenviar código.');
    } finally {
      setIsResending(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-canvas font-sans">
      {/* Left: fixed neural panel */}
      <div className="hidden lg:block">
        <AuthLeftPanel
          neuralState="encrypt"
          headline="Verificação de Identidade"
          subline="Protegemos o teu acesso com uma segunda camada de segurança."
        />
      </div>

      {/* Right: OTP form — offset by 50% to clear the fixed left panel */}
      <div className="flex items-center justify-center p-8 lg:p-12 min-h-screen lg:ml-[50%]">
        <div className="w-full max-w-sm">
          <header className="mb-12">
            <h1 className="text-5xl font-black text-ink-primary tracking-tight mb-2 font-display">
              Verificação.
            </h1>
            <p className="text-ink-secondary font-medium">
              Código de 6 dígitos enviado para o teu{' '}
              <span className="text-accent font-bold">{canal === 'email' ? 'email' : 'telemóvel'}</span>
            </p>
          </header>

          <form onSubmit={(e) => { void handleVerify(e); }} className="space-y-8">
            {error && (
              <div className="rounded-xl bg-red-500/10 p-4 text-sm font-bold text-red-500 border border-red-500/20">
                {error}
              </div>
            )}
            {resendSuccess && (
              <div className="rounded-xl bg-accent/10 p-4 text-sm font-bold text-accent border border-accent/20">
                Código reenviado com sucesso.
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-ink-tertiary uppercase tracking-[0.2em] mb-3">
                Código de Segurança
              </label>
              <input
                type="text"
                required
                maxLength={6}
                pattern="[0-9]*"
                inputMode="numeric"
                autoFocus
                className="w-full rounded-2xl bg-recessed border border-ink-tertiary/10 p-5 text-center text-4xl tracking-[0.4em] text-ink-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all font-mono placeholder:text-ink-tertiary/20 touch-target"
                placeholder="000000"
                value={otp}
                onChange={(e) => { setOtp(e.target.value.replace(/[^0-9]/g, '')); }}
              />
            </div>

            <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm text-ink-secondary">
              <input
                type="checkbox"
                checked={trustDevice}
                onChange={(event) => { setTrustDevice(event.target.checked); }}
                className="mt-0.5 size-5 accent-[var(--accent-terracotta)]"
              />
              <span>
                Confiar neste browser por 90 dias
                <span className="mt-1 block text-xs text-ink-tertiary">
                  Usa esta opção apenas num dispositivo privado.
                </span>
              </span>
            </label>

            <Button
              type="submit"
              disabled={isLoading || otp.length !== 6}
              className="w-full h-14 bg-ink-primary text-canvas font-black uppercase tracking-widest text-[11px] hover:bg-accent hover:text-ink-on-accent transition-all shadow-xl rounded-2xl"
            >
              {isLoading ? 'A Validar...' : 'Verificar e Aceder'}
            </Button>
          </form>

          <div className="mt-10 flex flex-col items-center gap-6">
            <button
              type="button"
              onClick={() => { void handleResend(); }}
              disabled={isResending || countdown > 0}
              className="group flex items-center gap-2 text-sm font-bold text-ink-tertiary hover:text-accent transition-colors disabled:opacity-40"
            >
              <RefreshCw
                size={14}
                className={isResending ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}
              />
              {isResending
                ? 'A reenviar...'
                : countdown > 0
                  ? `Aguarde ${String(countdown)}s`
                  : 'Reenviar código de acesso'}
            </button>

            <button
              type="button"
              onClick={() => { navigate('/login', { replace: true }); }}
              className="flex items-center gap-2 text-xs font-bold text-ink-tertiary uppercase tracking-widest hover:text-ink-primary transition-colors"
            >
              <ArrowLeft size={12} />
              Voltar ao Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

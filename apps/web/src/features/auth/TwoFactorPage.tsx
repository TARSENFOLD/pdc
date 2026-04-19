import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth/AuthContext';
import { authApi } from '@/lib/api/auth';
import { ShieldCheck, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui';

export default function TwoFactorPage() {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const { completeOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { canal?: 'email' | 'sms'; from?: string } | null;
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
      await completeOtp(otp, canal);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const body = err instanceof Error && 'body' in err ? (err as { body?: Record<string, string> }).body : undefined;
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
      const body = err instanceof Error && 'body' in err ? (err as { body?: Record<string, string> }).body : undefined;
      setError(body?.error ?? 'Erro ao reenviar código.');
    } finally {
      setIsResending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050505] px-4 font-sans selection:bg-accent/30">
      {/* Camada de Profundidade (Textura de Solo) */}
      <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('/images/pattern-afro.svg')] bg-repeat opacity-[0.03]" />
      
      <div className="w-full max-w-md relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 to-transparent blur-2xl opacity-20 pointer-events-none" />
        
        <div className="relative rounded-3xl bg-surface-raised/40 backdrop-blur-2xl p-8 lg:p-10 shadow-2xl border border-white/5 overflow-hidden">
          <div className="mb-10 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent border border-accent/20 animate-pulse-subtle">
              <ShieldCheck size={32} strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl font-black text-text-primary tracking-tight mb-3">Verificação.</h1>
            <p className="text-text-secondary font-medium px-4">
              Introduz o código de 6 dígitos enviado para o teu{' '}
              <span className="text-accent font-bold">{canal === 'email' ? 'email' : 'telemóvel'}</span>
            </p>
          </div>

          <form onSubmit={(e) => { void handleVerify(e); }} className="space-y-8">
            {error && (
              <div className="rounded-xl bg-error/10 p-4 text-sm font-bold text-error border border-error/20 animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}
            {resendSuccess && (
              <div className="rounded-xl bg-success/10 p-4 text-sm font-bold text-success border border-success/20 animate-in fade-in slide-in-from-top-2">
                Código reenviado com sucesso.
              </div>
            )}

            <div className="space-y-3">
              <label className="block text-xs font-bold text-text-muted uppercase tracking-[0.2em] ml-1">Código de Segurança</label>
              <input
                type="text"
                required
                maxLength={6}
                pattern="[0-9]*"
                inputMode="numeric"
                autoFocus
                className="w-full rounded-2xl bg-black/40 border border-white/10 p-5 text-center text-4xl tracking-[0.4em] text-text-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all font-mono placeholder:text-white/5"
                placeholder="000000"
                value={otp}
                onChange={(e) => { setOtp(e.target.value.replace(/[^0-9]/g, '')); }}
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading || otp.length !== 6}
              className="w-full p-6 bg-text-primary text-background font-black uppercase tracking-widest rounded-2xl hover:bg-accent hover:text-white transition-all transform active:scale-[0.98]"
            >
              {isLoading ? 'A Validar Autoridade...' : 'Verificar e Aceder'}
            </Button>
          </form>

          <div className="mt-10 flex flex-col items-center gap-6">
            <button
              type="button"
              onClick={() => { void handleResend(); }}
              disabled={isResending || countdown > 0}
              className="group flex items-center gap-2 text-sm font-bold text-text-muted hover:text-accent transition-colors disabled:opacity-40"
            >
              <RefreshCw size={14} className={isResending ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
              {isResending ? 'A reenviar...' : countdown > 0 ? `Aguarde ${String(countdown)}s` : 'Reenviar código de acesso'}
            </button>

            <button
              onClick={() => { navigate('/login', { replace: true }); }}
              className="flex items-center gap-2 text-xs font-bold text-text-muted uppercase tracking-widest hover:text-text-primary transition-colors"
            >
              <ArrowLeft size={12} />
              Voltar ao Login
            </button>
          </div>
        </div>

        {/* Detalhe Mono-espaçado de Elite */}
        <div className="mt-8 text-center text-[10px] font-mono text-text-muted/40 uppercase tracking-[0.3em]">
          Security Layer: OTP_V2_ENFORCED <br />
          Sovereign Identity Protection
        </div>
      </div>
    </div>
  );
}


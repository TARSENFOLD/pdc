import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth/AuthContext';
import { authApi } from '@/lib/api/auth';

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
  const from = state?.from ?? '/app/dashboard';

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
      setCountdown(60); // 1 minute countdown
      setTimeout(() => { setResendSuccess(false); }, 3000);
    } catch (err: unknown) {
      const body = err instanceof Error && 'body' in err ? (err as { body?: Record<string, string> }).body : undefined;
      setError(body?.error ?? 'Erro ao reenviar código.');
    } finally {
      setIsResending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4">
      <div className="w-full max-w-md rounded-2xl bg-[#141414] p-8 shadow-2xl border border-white/5">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#f59e0b]/10 text-[#f59e0b]">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Verificação</h1>
          <p className="text-gray-400">
            Introduza o código de 6 dígitos enviado para o seu{' '}
            <span className="text-white font-medium">{canal === 'email' ? 'email' : 'telemóvel'}</span>
          </p>
        </div>

        <form onSubmit={(e) => { void handleVerify(e); }} className="space-y-6">
          {error && (
            <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20">
              {error}
            </div>
          )}
          {resendSuccess && (
            <div className="rounded-lg bg-green-500/10 p-3 text-sm text-green-500 border border-green-500/20">
              Código reenviado com sucesso.
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Código de verificação</label>
            <input
              type="text"
              required
              maxLength={6}
              pattern="[0-9]*"
              inputMode="numeric"
              autoFocus
              className="w-full rounded-lg bg-[#1a1a1a] border border-white/10 p-3 text-center text-2xl tracking-[0.5em] text-white focus:border-[#f59e0b] focus:outline-none transition-colors font-mono"
              placeholder="000000"
              value={otp}
              onChange={(e) => { setOtp(e.target.value.replace(/[^0-9]/g, '')); }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || otp.length !== 6}
            className="w-full rounded-lg bg-[#f59e0b] p-3 font-semibold text-black hover:bg-[#d97706] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'A verificar...' : 'Verificar'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-400">
          Não recebeu o código?{' '}
          <button
            type="button"
            onClick={() => { void handleResend(); }}
            disabled={isResending || countdown > 0}
            className="text-[#f59e0b] font-semibold hover:underline bg-transparent border-none cursor-pointer disabled:opacity-50"
          >
            {isResending ? 'A reenviar...' : countdown > 0 ? `Aguarde ${String(countdown)}s` : 'Reenviar código'}
          </button>
        </p>

        <div className="mt-6 text-center">
          <button
            onClick={() => { navigate('/login', { replace: true }); }}
            className="text-sm text-gray-500 hover:text-white transition-colors"
          >
            Voltar ao login
          </button>
        </div>
      </div>
    </div>
  );
}

import { useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

import { useAuth } from '@/lib/auth/AuthContext';
import { authApi } from '@/lib/api/auth';
import { useTelemetry } from '@/hooks/useTelemetry';
import { AsymmetricButton } from '@/components/ui';

gsap.registerPlugin(useGSAP);

// Configuração dos Blocos (Formas e Cores Low-Poly) - Epic 05
const blockTypes = [
  { shape: 'cube', color: 'var(--accent-terracotta)' },
  { shape: 'pyramid', color: 'var(--institutional-cobalt)' },
  { shape: 'sphere', color: '#a855f7' }, // Purple elite
  { shape: 'torus', color: 'var(--accent-success)' }
];

export default function LoginPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const leftPaneRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const blocksRefs = useRef<HTMLDivElement[]>([]);
  
  const blockCount = 15;
  const [loginStatus, setLoginStatus] = useState<'idle' | 'typing' | 'success' | 'failure'>('idle');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const { track } = useTelemetry();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/app';

  const { contextSafe } = useGSAP({ scope: leftPaneRef });

  useGSAP(() => {
    gsap.fromTo(blocksRefs.current, 
      { 
        x: "-=300", 
        y: () => gsap.utils.random(-100, 100),
        rotate: () => gsap.utils.random(-180, 180),
        scale: 0.5,
        opacity: 0
      },
      {
        x: () => gsap.utils.random(-50, 50),
        y: () => gsap.utils.random(-150, 150),
        rotate: 0,
        scale: 1,
        opacity: 0.7,
        stagger: 0.1,
        duration: 1.5,
        ease: "elastic.out(1, 0.7)",
        onComplete: startIdleAnimation
      }
    );

    function startIdleAnimation() {
      if (loginStatus !== 'idle') return;
      blocksRefs.current.forEach(block => {
        gsap.to(block, {
          y: "+=20",
          x: "+=15",
          rotate: "+=10",
          duration: () => gsap.utils.random(2, 4),
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut"
        });
      });
    }
  });

  const handleTypingFocus = contextSafe(() => {
    setLoginStatus('typing');
    gsap.killTweensOf(blocksRefs.current);

    blocksRefs.current.forEach((block, i) => {
      const yPos = 120 - (i * 18);
      const rotation = i % 2 === 0 ? 5 : -5;

      gsap.to(block, {
        x: 0,
        y: yPos,
        scale: 1.2,
        rotate: rotation,
        opacity: 1,
        duration: 0.6,
        ease: "back.out(1.7)",
        onComplete: startJiggle
      });

      function startJiggle() {
        if (loginStatus !== 'typing') return;
        gsap.to(block, {
          rotate: i % 2 === 0 ? -10 : 10,
          y: "+=3",
          duration: 0.1 + (i * 0.01),
          repeat: -1,
          yoyo: true,
          ease: "power1.inOut"
        });
      }
    });
  });

  const handleInputBlur = contextSafe(() => {
    if (loginStatus === 'success' || loginStatus === 'failure') return;
    setLoginStatus('idle');
    gsap.killTweensOf(blocksRefs.current);
    gsap.to(blocksRefs.current, {
      x: () => gsap.utils.random(-50, 50),
      y: () => gsap.utils.random(-150, 150),
      rotate: 0,
      scale: 1,
      opacity: 0.7,
      duration: 1,
      stagger: 0.05,
      ease: "power2.inOut"
    });
  });

  const simulateFailure = contextSafe(() => {
    setLoginStatus('failure');
    gsap.to(blocksRefs.current, {
      y: "+=300",
      x: () => gsap.utils.random(-200, 200),
      rotate: () => gsap.utils.random(-180, 180),
      scale: 0.6,
      backgroundColor: "#404040",
      duration: 0.8,
      stagger: 0.02,
      ease: "power4.in",
      onComplete: () => {
        gsap.fromTo(leftPaneRef.current, { x: -5 }, { x: 5, duration: 0.05, repeat: 10, yoyo: true });
        setTimeout(() => {
            if (document.activeElement?.tagName === 'INPUT') {
                handleTypingFocus();
            } else {
                handleInputBlur();
            }
        }, 1500);
      }
    });
  });

  const simulateSuccess = contextSafe(() => {
    setLoginStatus('success');
    gsap.to(formRef.current, { opacity: 0, x: 20, duration: 0.5 });
    
    gsap.to(blocksRefs.current, {
      backgroundColor: "var(--accent-terracotta)",
      rotate: 0,
      scale: 1.5,
      opacity: 1,
      duration: 0.4,
      ease: "back.out(3)"
    });

    gsap.to(blocksRefs.current, {
      y: -500,
      scale: 0.5,
      duration: 0.8,
      ease: "power4.in",
      delay: 0.5,
      onComplete: () => {
        navigate('/app', { replace: true });
      }
    });
  });

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
        simulateSuccess();
      }
    } catch (err: unknown) {
      const body = err instanceof Error && 'body' in err ? (err as { body?: Record<string, string> }).body : undefined;
      setError(body?.error ?? 'Erro ao iniciar sessão. Verifique as suas credenciais.');
      simulateFailure();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div ref={containerRef} className="grid grid-cols-1 lg:grid-cols-2 min-h-screen bg-canvas overflow-hidden font-sans">
      
      {/* LADO ESQUERDO: A Animação */}
      <div 
        ref={leftPaneRef}
        className="relative flex items-center justify-center bg-recessed border-r border-ink-tertiary/10 [perspective:1000px] hidden lg:flex"
      >
        {Array.from({ length: blockCount }).map((_, i) => {
          const config = blockTypes[i % blockTypes.length]!;
          return (
            <div 
              key={i}
              ref={(el) => { if (el) blocksRefs.current[i] = el; }}
              className="absolute w-12 h-12 shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-transform preserve-3d"
              style={{
                backgroundColor: config.color,
                borderRadius: config.shape === 'sphere' ? '50%' : config.shape === 'torus' ? '30%' : '4px',
                clipPath: config.shape === 'pyramid' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : 'none'
              }}
            />
          );
        })}
        
        <div className="absolute bottom-10 left-10 text-ink-tertiary text-xs font-mono tracking-tighter">
          SYSTEM: ACTIVE <br />
          MORPHOLOGY: MULTI-BODY_STANCE
        </div>
      </div>

      {/* LADO DIREITO: O Login */}
      <div className="flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-sm">
          <header className="mb-12">
            <h1 className="text-5xl font-black text-ink-primary tracking-tight mb-2 font-display">Login.</h1>
            <p className="text-ink-secondary font-medium">Bem-vindo de volta ao teu futuro.</p>
          </header>

          {error && (
            <div className="rounded-lg bg-red-500/10 p-4 font-medium text-sm text-red-500 border border-red-500/20 mb-6 backdrop-blur-md">
              {error}
            </div>
          )}

          <form ref={formRef} onSubmit={(e) => { void handleSubmit(e); }} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-ink-tertiary uppercase tracking-widest mb-2">Identificação Académica</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => { setEmail(e.target.value); }}
                onFocus={handleTypingFocus}
                onBlur={handleInputBlur}
                placeholder="nome@exemplo.com"
                className="w-full p-4 bg-recessed border border-ink-tertiary/10 rounded-xl text-base text-ink-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all placeholder:text-ink-tertiary touch-target"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-ink-tertiary uppercase tracking-widest mb-2">Chave de Acesso</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => { setPassword(e.target.value); }}
                onFocus={handleTypingFocus}
                onBlur={handleInputBlur}
                placeholder="••••••••"
                className="w-full p-4 bg-recessed border border-ink-tertiary/10 rounded-xl text-base text-ink-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all placeholder:text-ink-tertiary touch-target"
              />
            </div>

            <AsymmetricButton 
              type="submit"
              disabled={isLoading}
              className="w-full h-14 bg-ink-primary text-canvas font-black uppercase tracking-widest text-[11px] hover:bg-accent hover:text-ink-on-accent transition-all shadow-xl"
            >
              {isLoading ? 'A Processar...' : 'Aceder Plataforma'}
            </AsymmetricButton>

            <div className="mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-ink-tertiary/10"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-canvas px-4 text-ink-tertiary font-mono tracking-widest text-xs uppercase">ou</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => { authApi.loginWithGoogle(); }}
                className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-ink-tertiary/10 bg-recessed p-4 font-bold text-ink-primary transition-colors hover:bg-ink-tertiary/10 active:scale-[0.98] touch-target"
              >
                Continuar com Google
              </button>
            </div>
          </form>

          <footer className="mt-12 pt-8 border-t border-ink-tertiary/10 flex flex-col gap-4 sm:flex-row sm:justify-between text-sm text-ink-tertiary font-medium">
            <Link to="/forgot-password" replace className="hover:text-ink-primary transition-colors">Esqueci-me da chave</Link>
            <Link to="/criar-conta" replace className="hover:text-ink-primary transition-colors">Criar conta académica</Link>
          </footer>
        </div>
      </div>
    </div>
  );
}

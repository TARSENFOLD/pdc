import { useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { MicroDesafio } from './MicroDesafio';
import { NeuralConstellation, ChoreographyState } from './NeuralConstellation';

export function LandingHero() {
  const reduced = useReducedMotion();
  const navigate = useNavigate();
  const [choreography, setChoreography] = useState<ChoreographyState>('idle');
  const [isWarping, setIsWarping] = useState(false);

  const stagger = (i: number) =>
    reduced
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3 } }
      : {
          initial: { opacity: 0, y: 32 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay: i * 0.12, ease: 'easeOut' },
        };

  return (
    <section 
      className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-4 pt-24 pb-16 text-center sm:px-6"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {/* Hero background image */}
      <NeuralConstellation choreography={choreography} />
      {/* Heritage Fractal Base Pattern Overlay (Adinkra inspired geometry) */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.06] mix-blend-multiply dark:mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0L40 20L20 40L0 20Z' fill='%23C1440E'/%3E%3Cpath d='M0 0h10v10H0zM30 30h10v10H30z' fill='%23C1440E'/%3E%3C/svg%3E")`, backgroundSize: '40px 40px' }} />

      {/* Glow cinemático isolado "Imagem Desfocada" no núcleo para leitura espetacular do texto, sem macular os limites do ecrã! */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] w-[80vw] h-[600px] bg-[radial-gradient(circle_at_center,rgba(240,239,231,1)_0%,transparent_60%)] dark:bg-[radial-gradient(circle_at_center,rgba(13,13,13,1)_0%,transparent_60%)] blur-3xl opacity-80" />
      
      {/* Suavização geral ultra-fina só para consolidar ruído fractal */}
      <div className="pointer-events-none absolute inset-0 bg-background/5 backdrop-blur-[1px]" />

      <motion.div {...stagger(0)} className="relative z-10 mb-8">
        <div className="inline-flex items-center gap-3 rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 py-1.5 px-4 text-xs font-semibold tracking-wide text-text-secondary dark:text-white/80 backdrop-blur-lg shadow-md dark:shadow-[0_4px_24px_-8px_rgba(0,0,0,0.6)]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber"></span>
          </span>
          A tua comunidade educacional
        </div>
      </motion.div>

      <motion.h1
        {...stagger(1)}
        className="relative z-10 mx-auto max-w-4xl text-5xl font-medium tracking-tight text-text-primary sm:text-6xl lg:text-7xl leading-[1.1]"
      >
        Experimenta uma profissão antes de{' '}
        <span className="font-display italic text-amber drop-shadow-md dark:drop-shadow-[0_0_30px_rgba(193,68,14,0.3)]">escolher.</span>
      </motion.h1>

      <motion.p
        {...stagger(2)}
        className="relative z-10 mx-auto mt-6 max-w-xl text-lg text-text-secondary dark:text-white/70"
      >
        Descubra como é o dia a dia de um estudante do curso que você quer fazendo atividades práticas virtuais. Junta-te a nós e decide o teu futuro com segurança.
      </motion.p>

      <motion.div {...stagger(3)} className="relative z-10 mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <Link
          to="/criar-conta"
          onMouseEnter={() => setChoreography('swarm')}
          onMouseLeave={() => setChoreography('idle')}
          onClick={(e) => {
            if (reduced) return;
            e.preventDefault();
            if (isWarping) return;
            setIsWarping(true);
            setChoreography('warp');
            setTimeout(() => navigate('/criar-conta'), 600);
          }}
          className="relative w-full rounded-tr-2xl rounded-bl-2xl rounded-tl-sm rounded-br-sm bg-amber px-8 py-4 text-sm font-bold text-background transition-colors sm:w-auto overflow-hidden shadow-md active:scale-[0.98] hover:bg-amber-hover"
        >
          Vamos descobrir a tua vocação
        </Link>
        <a
          href="#como-funciona"
          onMouseEnter={() => setChoreography('swarm')}
          onMouseLeave={() => setChoreography('idle')}
          className="w-full rounded-tr-sm rounded-bl-sm rounded-tl-2xl rounded-br-2xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 backdrop-blur-lg px-8 py-4 text-sm font-bold text-text-primary transition-all hover:bg-black/10 dark:hover:bg-white/10 hover:text-text-primary dark:hover:text-white sm:w-auto active:scale-[0.98]"
        >
          Entenda como funciona
        </a>
      </motion.div>

      <div 
        className="relative z-10"
        onMouseEnter={() => setChoreography('swarm')}
        onMouseLeave={() => setChoreography('idle')}
      >
        <MicroDesafio />
      </div>

      <motion.div {...stagger(4)} className="relative z-10 mt-16 max-w-lg w-full">
        {/* Subtle geometric divider inspired by traditional woven patterns */}
        <div className="flex justify-center items-center gap-4 opacity-40">
           <div className="h-px bg-text-primary/20 flex-1"></div>
           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-amber">
              <path d="M12 2L2 12L12 22L22 12L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="miter"/>
              <path d="M12 8L8 12L12 16L16 12L12 8Z" fill="currentColor"/>
           </svg>
           <div className="h-px bg-text-primary/20 flex-1"></div>
        </div>
      </motion.div>

      <motion.div
        className="relative z-10 mt-16"
        animate={reduced ? {} : { y: [0, 8, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <svg className="h-6 w-6 text-text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
        </svg>
      </motion.div>
    </section>
  );
}

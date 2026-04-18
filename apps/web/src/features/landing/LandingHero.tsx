import { useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { MicroDesafio } from './MicroDesafio';
import { NeuralConstellation, ChoreographyState } from './NeuralConstellation';

const STATS: Array<{ value: string; label: string }> = [
  { value: '7', label: 'áreas vocacionais' },
  { value: '3 tipos', label: 'de simulação prática' },
  { value: '6 roles', label: 'estudante a instituição' },
];

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
      {/* Dynamic overlay for text readability: adapts to Light or Dark background */}
      <div className="pointer-events-none absolute inset-0 bg-background/80 backdrop-blur-[1px]" />
      <div className="pointer-events-none absolute inset-0 opacity-50 dark:opacity-100 bg-[radial-gradient(circle_at_50%_0%,rgba(0,74,173,0.1)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_0%,rgba(255,92,0,0.08)_0%,transparent_50%)]" />

      <motion.div {...stagger(0)} className="relative z-10 mb-8">
        <div className="inline-flex items-center gap-3 rounded-full border border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5 py-1.5 px-4 text-xs font-semibold tracking-wide text-text-secondary dark:text-white/80 backdrop-blur-md shadow-sm dark:shadow-[0_4px_24px_-8px_rgba(0,0,0,0.5)]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber"></span>
          </span>
          Plataforma Educacional Angolana
        </div>
      </motion.div>

      <motion.h1
        {...stagger(1)}
        className="relative z-10 mx-auto max-w-5xl text-5xl font-medium tracking-tighter text-text-primary sm:text-6xl lg:text-7xl xl:text-[5.5rem] leading-[1.05]"
      >
        Experimenta a prática antes de{' '}
        <span className="font-display italic text-amber drop-shadow-md dark:drop-shadow-[0_0_30px_rgba(255,92,0,0.3)]">escolher.</span>
      </motion.h1>

      <motion.p
        {...stagger(2)}
        className="relative z-10 mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-text-secondary dark:text-white/50 font-light tracking-wide sm:text-xl"
      >
        A primeira simulação vocacional do mundo baseada em comportamento real. Descobre o teu caminho de carreira sem suposições.
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
          className="group relative w-full rounded-2xl bg-amber px-8 py-4 text-sm font-bold tracking-widest uppercase text-white dark:text-black transition-all sm:w-auto overflow-hidden shadow-lg dark:shadow-[0_0_40px_-10px_rgba(255,92,0,0.5)] hover:shadow-xl dark:hover:shadow-[0_0_60px_-15px_rgba(255,92,0,0.7)] hover:scale-[1.02] active:scale-[0.98]"
        >
          {/* Brilho interno do botão para aspeto tátil */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none"></div>
          <span className="relative z-10">Começar a Exploração</span>
        </Link>
        <a
          href="#como-funciona"
          className="group w-full rounded-2xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 backdrop-blur-lg px-8 py-4 text-sm font-bold tracking-widest uppercase text-text-secondary dark:text-white/80 transition-all hover:bg-black/10 dark:hover:bg-white/10 hover:text-text-primary dark:hover:text-white sm:w-auto active:scale-[0.98]"
        >
          Ver como Funciona
        </a>
      </motion.div>

      <div 
        className="relative z-10"
        onMouseEnter={() => setChoreography('align')}
        onMouseLeave={() => setChoreography('idle')}
      >
        <MicroDesafio />
      </div>

      <motion.div {...stagger(4)} className="relative z-10 mt-20 flex flex-col sm:flex-row items-center gap-8 sm:gap-16 border-y border-black/5 dark:border-white/5 py-8 backdrop-blur-sm">
        {STATS.map((stat) => (
          <div key={stat.label} className="flex flex-col items-center gap-2">
            <span className="font-display text-4xl sm:text-5xl font-medium text-amber drop-shadow-sm dark:drop-shadow-[0_0_15px_rgba(255,92,0,0.3)]">{stat.value}</span>
            <span className="text-xs font-medium tracking-widest uppercase text-text-muted dark:text-white/40">{stat.label}</span>
          </div>
        ))}
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

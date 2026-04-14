import { useReducedMotion } from 'motion/react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { MicroDesafio } from './MicroDesafio';

const STATS: Array<{ value: string; label: string }> = [
  { value: '7', label: 'áreas vocacionais' },
  { value: '3 tipos', label: 'de simulação prática' },
  { value: '6 roles', label: 'estudante a instituição' },
];

export function LandingHero() {
  const reduced = useReducedMotion();

  const stagger = (i: number) =>
    reduced
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3 } }
      : {
          initial: { opacity: 0, y: 32 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay: i * 0.12, ease: 'easeOut' },
        };

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 pt-24 pb-16 text-center sm:px-6">
      {/* Hero background image */}
      <img
        src="/images/hero/hero-students.jpg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      {/* Dark overlay for text readability */}
      <div className="pointer-events-none absolute inset-0 bg-background/85" />

      <motion.div {...stagger(0)} className="relative z-10 mb-4">
        <span className="inline-flex items-center gap-2 rounded-full border border-amber/30 bg-amber/10 px-4 py-1.5 text-xs font-medium text-amber">
          Plataforma educacional angolana
        </span>
      </motion.div>

      <motion.h1
        {...stagger(1)}
        className="relative z-10 mx-auto max-w-4xl text-4xl font-bold leading-tight tracking-tight text-text-primary sm:text-5xl lg:text-6xl"
      >
        Experimenta antes de{' '}
        <span className="text-amber">escolher</span>
      </motion.h1>

      <motion.p
        {...stagger(2)}
        className="relative z-10 mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-text-secondary"
      >
        Simula profissões reais, descobre onde te encaixas e escolhe o teu curso
        com base no teu comportamento — não em suposições.
      </motion.p>

      <motion.div {...stagger(3)} className="relative z-10 mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <Link
          to="/criar-conta"
          className="w-full rounded-xl bg-amber px-8 py-3.5 text-base font-semibold text-black transition-all hover:bg-amber-hover hover:scale-[1.02] sm:w-auto"
        >
          Começar — é grátis
        </Link>
        <a
          href="#como-funciona"
          className="w-full rounded-xl border border-border bg-surface-raised px-8 py-3.5 text-base font-semibold text-text-primary transition-colors hover:bg-surface sm:w-auto"
        >
          Ver como funciona
        </a>
      </motion.div>

      <div className="relative z-10">
        <MicroDesafio />
      </div>

      <motion.div {...stagger(4)} className="relative z-10 mt-20 grid grid-cols-1 gap-8 sm:grid-cols-3">
        {STATS.map((stat) => (
          <div key={stat.label} className="flex flex-col items-center gap-1">
            <span className="text-3xl font-bold text-amber">{stat.value}</span>
            <span className="text-sm text-text-muted">{stat.label}</span>
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

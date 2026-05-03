import { useAuth } from '@/lib/auth/AuthContext';
import { Link } from 'react-router-dom';
import { Spinner } from '@/components/ui';
import {
  FlaskConical, BookOpen, FolderKanban, GraduationCap,
  PlayCircle,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import type { Role } from '@pdc/shared';

interface QuickAction {
  label: string;
  labelPt: string;
  to: string;
  icon: React.ElementType;
  accent?: boolean;
}

const QUICK_ACTIONS_ESTUDANTE: QuickAction[] = [
  { label: 'Simulações', labelPt: 'Simulações', to: '/app/simulacoes', icon: FlaskConical, accent: true },
  { label: 'Programa',   labelPt: 'Programa',   to: '/app/programas',  icon: GraduationCap },
  { label: 'Projecto',   labelPt: 'Projecto',   to: '/app/explorar',   icon: FolderKanban },
  { label: 'Curso',      labelPt: 'Curso',      to: '/app/cursos',     icon: BookOpen },
];

const QUICK_ACTIONS_BY_ROLE: Partial<Record<Role, QuickAction[]>> = {
  estudante: QUICK_ACTIONS_ESTUDANTE,
  mentor: [
    { label: 'Simulações', labelPt: 'Simulações', to: '/app/mentor/simulacoes', icon: FlaskConical, accent: true },
    { label: 'Programa',   labelPt: 'Programa',   to: '/app/instituicao/programas', icon: GraduationCap },
    { label: 'Projecto',   labelPt: 'Projecto',   to: '/app/explorar',              icon: FolderKanban },
    { label: 'Curso',      labelPt: 'Curso',      to: '/app/mentor/cursos',         icon: BookOpen },
  ],
};

const SPRING = { type: 'spring', stiffness: 220, damping: 28 } as const;
const NO_MOTION = { duration: 0 } as const;

export default function HomePage(): React.ReactNode {
  const { user, isLoading } = useAuth();
  const prefersReducedMotion = useReducedMotion();
  const transition = prefersReducedMotion ? NO_MOTION : SPRING;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const role: Role = user?.role ?? 'estudante';
  const quickActions = QUICK_ACTIONS_BY_ROLE[role] ?? QUICK_ACTIONS_ESTUDANTE;
  const firstName = user?.nome ? user.nome.split(' ')[0] : 'utilizador';

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-16 animate-in fade-in duration-500">

      {/* ── 5 Botões Circulares — topo, centrados ── */}
      <section aria-label="Acções rápidas" className="pt-6">
        <div className="flex items-start justify-center gap-6 sm:gap-10 flex-wrap">
          {quickActions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <motion.div
                key={`${action.to}-${String(idx)}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={prefersReducedMotion ? NO_MOTION : { ...SPRING, delay: idx * 0.07 }}
                className="flex flex-col items-center gap-2"
              >
                <Link
                  to={action.to}
                  className="group relative flex h-16 w-16 items-center justify-center rounded-full transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  style={{
                    background: action.accent
                      ? 'var(--accent-terracotta)'
                      : 'var(--surface-elevated)',
                    border: `1.5px solid ${action.accent === true ? 'transparent' : 'var(--chrome-border)'}`,
                    boxShadow: action.accent
                      ? '0 0 0 4px rgba(182,95,42,0.18)'
                      : 'var(--elevation-1)',
                    color: action.accent ? 'var(--ink-on-accent)' : 'var(--ink-secondary)',
                  }}
                  aria-label={action.labelPt}
                >
                  <Icon size={22} strokeWidth={1.8} />
                </Link>
                <span
                  className="text-xs font-medium text-center leading-tight max-w-[72px] truncate"
                  style={{ color: 'var(--ink-secondary)' }}
                >
                  {action.labelPt}
                </span>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── Saudação discreta ── */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ ...transition, delay: 0.38 }}
        className="text-center"
      >
        <p className="text-sm font-medium" style={{ color: 'var(--ink-secondary)' }}>
          Bem-vindo de volta, <span style={{ color: 'var(--ink-primary)' }}>{firstName}</span>
        </p>
      </motion.div>

      {/* ── Card de Vídeo "Como Começar" ── */}
      <motion.section
        initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...transition, delay: 0.45 }}
        aria-label="Como começar"
        className="space-y-3"
      >
        {/* Título acima do card */}
        <div>
          <p
            className="text-[10px] font-semibold uppercase tracking-widest mb-1"
            style={{ color: 'var(--accent-terracotta)' }}
          >
            Guia de início
          </p>
          <p className="text-base font-bold" style={{ color: 'var(--ink-primary)' }}>
            Como começar no PDC
          </p>
        </div>

        {/* Card de vídeo */}
        <div
          className="relative w-full overflow-hidden rounded-2xl"
          style={{
            background: 'var(--surface-elevated)',
            border: '1px solid var(--chrome-border)',
            boxShadow: 'var(--elevation-2)',
          }}
        >
          <div
            className="relative flex items-center justify-center"
            style={{
              aspectRatio: '16/7',
              background: 'linear-gradient(135deg, var(--surface-canvas) 0%, var(--surface-elevated) 60%, var(--chrome-surface-strong) 100%)',
            }}
          >
            {/* Play button centrado */}
            <button
              type="button"
              aria-label="Reproduzir vídeo"
              className="flex h-16 w-16 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{
                background: 'var(--accent-terracotta)',
                boxShadow: '0 0 0 8px rgba(182,95,42,0.18)',
              }}
            >
              <PlayCircle size={32} className="text-[var(--ink-on-accent)]" strokeWidth={1.5} />
            </button>

            {/* Duração */}
            <div
              className="absolute bottom-3 right-4 rounded px-2 py-0.5 text-[11px] font-bold tabular-nums"
              style={{
                background: 'var(--overlay-dark, rgba(13,17,23,0.70))',
                color: 'var(--ink-on-accent)',
                backdropFilter: 'blur(4px)',
              }}
            >
              5:00
            </div>
          </div>
        </div>
      </motion.section>

    </div>
  );
}

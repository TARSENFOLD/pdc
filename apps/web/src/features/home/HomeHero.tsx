import type { ElementType } from 'react';
import { Link } from 'react-router-dom';
import {
  Compass, FlaskConical, BookOpen, FolderKanban, User,
  ArrowRight, PlayCircle, Zap, CheckCircle, Shield, BarChart2,
  GraduationCap,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { APPLE_SPRING } from '@/lib/animations';
import type { HomeSummary, Role } from '@pdc/shared';

const NO_MOTION = { duration: 0 } as const;

// ── Journey steps — cada um conta uma história ──

interface JourneyStep {
  label: string;
  desc: string;
  to: string;
  icon: ElementType;
  accent?: boolean;
}

const JOURNEY_ESTUDANTE: JourneyStep[] = [
  { label: 'Experiências',       desc: 'Descobre áreas antes de escolher', to: '/app/explorar',            icon: Compass,       accent: true },
  { label: 'Simulações',         desc: 'Testa tarefas reais',              to: '/app/simulacoes',          icon: FlaskConical },
  { label: 'Cursos',             desc: 'Desenvolve competências',          to: '/app/cursos',              icon: BookOpen },
  { label: 'Projectos',          desc: 'Mostra o teu potencial',           to: '/app/explorar',            icon: FolderKanban },
  { label: 'Perfil Vocacional',  desc: 'Vê o que os teus dados revelam',   to: '/app/dashboard/estudante', icon: User },
];

const JOURNEY_MENTOR: JourneyStep[] = [
  { label: 'Simulações',   desc: 'Gerir tarefas',    to: '/app/mentor/simulacoes',     icon: FlaskConical, accent: true },
  { label: 'Programas',    desc: 'Acompanhar',        to: '/app/instituicao/programas', icon: GraduationCap },
  { label: 'Cursos',       desc: 'Conteúdos',         to: '/app/mentor/cursos',         icon: BookOpen },
  { label: 'Explorar',     desc: 'Descobrir',         to: '/app/explorar',              icon: Compass },
  { label: 'Dashboard',    desc: 'Visão geral',       to: '/app/dashboard/mentor',      icon: BarChart2 },
];

const JOURNEY_BY_ROLE: Partial<Record<Role, JourneyStep[]>> = {
  estudante:   JOURNEY_ESTUDANTE,
  mentor:      JOURNEY_MENTOR,
  instituicao: [
    { label: 'Programas',  desc: 'Gerir programas',  to: '/app/instituicao/programas', icon: GraduationCap, accent: true },
    { label: 'Cursos',     desc: 'Conteúdos',        to: '/app/mentor/cursos',         icon: BookOpen },
    { label: 'Experiências', desc: 'Publicar conteúdo', to: '/app/instituicao/experiencias', icon: Compass },
    { label: 'Relatórios', desc: 'Visão geral',      to: '/app/dashboard/instituicao', icon: BarChart2 },
    { label: 'Simulações', desc: 'Gerir tarefas',    to: '/app/mentor/simulacoes',     icon: FlaskConical },
  ],
  moderador: [
    { label: 'Aprovações', desc: 'Perfis pendentes', to: '/app/admin/aprovacoes', icon: CheckCircle, accent: true },
    { label: 'Moderação',  desc: 'Conteúdos',        to: '/app/moderacao',        icon: Shield },
    { label: 'Simulações', desc: 'Ver todas',         to: '/app/simulacoes',       icon: FlaskConical },
    { label: 'Feed',       desc: 'Comunidade',        to: '/app/feed',             icon: Zap },
    { label: 'Dashboard',  desc: 'Visão geral',       to: '/app/dashboard/moderador', icon: BarChart2 },
  ],
};


interface Props {
  summary: HomeSummary;
  role: Role;
}

export function HomeHero({ summary, role }: Props) {
  const reduced = useReducedMotion();
  const tr = (delay = 0) => reduced ? NO_MOTION : { ...APPLE_SPRING, delay };
  const { stats, nextDirective } = summary;

  // Sempre usar JOURNEY_BY_ROLE para descrições ricas — BFF apenas define as rotas
  const journey: JourneyStep[] = JOURNEY_BY_ROLE[role] ?? JOURNEY_ESTUDANTE;

  const xp = stats.xp ?? 0;

  return (
    <div className="space-y-6">

      {/* ── Greeting + state summary ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={tr(0)}
        className="text-center pt-2"
      >
        <h1 className="text-xl sm:text-2xl font-bold text-ink-primary leading-tight">
          {summary.greeting}
        </h1>
        {xp > 0 || stats.reputacao > 0 ? (
          <p className="mt-1 text-sm text-ink-secondary">
            {xp > 0 && <><span className="font-semibold text-ink-primary">{xp.toLocaleString('pt-AO')}</span> XP</>}
            {xp > 0 && stats.reputacao > 0 && ' · '}
            {stats.reputacao > 0 && <><span className="font-semibold text-ink-primary">{stats.reputacao}</span> Reputação</>}
            {stats.conquistasCount !== undefined && stats.conquistasCount > 0 && (
              <> · <span className="font-semibold text-ink-primary">{stats.conquistasCount}</span> conquistas</>
            )}
          </p>
        ) : (
          <p className="mt-1 text-sm text-ink-tertiary">
            A tua jornada começa aqui. Explora e acumula XP.
          </p>
        )}
      </motion.div>

      {/* ── Next directive — always visible if exists ── */}
      {nextDirective && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={tr(0.04)}
        >
          <Link to={nextDirective.to} className="block group">
            <div className="flex items-center gap-3 rounded-lg bg-accent/10 border border-accent/20 p-4 transition-colors hover:bg-accent/15">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-white">
                <ArrowRight size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-accent mb-0.5">Próximo passo</p>
                <p className="text-sm font-semibold text-ink-primary leading-snug truncate">{nextDirective.label}</p>
                {nextDirective.description && (
                  <p className="text-xs text-ink-secondary mt-0.5 truncate">{nextDirective.description}</p>
                )}
              </div>
            </div>
          </Link>
        </motion.div>
      )}

      {/* ── Journey steps (not just categories) ── */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={tr(0.08)}
        aria-label="A tua jornada"
      >
        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary mb-3 text-center">
          A tua jornada
        </p>
        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {journey.slice(0, 5).map((step, idx) => {
            const Icon = step.icon;
            return (
              <Link
                key={`${step.to}-${String(idx)}`}
                to={step.to}
                className="flex flex-col items-center gap-1.5 group"
                aria-label={`${step.label}: ${step.desc}`}
              >
                <div
                  className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full transition-all duration-200 group-hover:scale-105 active:scale-95"
                  style={{
                    background: step.accent ? 'var(--color-accent)' : 'var(--color-elevated)',
                    border: `1.5px solid ${step.accent === true ? 'transparent' : 'var(--color-border)'}`,
                    color: step.accent === true ? 'var(--ink-on-accent)' : 'var(--color-ink-secondary)',
                    minWidth: 44, minHeight: 44,
                  }}
                >
                  <Icon size={18} strokeWidth={1.8} />
                </div>
                <div className="text-center min-w-0 w-full">
                  <p className="text-[10px] sm:text-[11px] font-semibold text-ink-primary truncate">{step.label}</p>
                  {step.desc && (
                    <p className="text-[8px] sm:text-[9px] text-ink-tertiary truncate hidden sm:block">{step.desc}</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </motion.section>

      {/* ── Vídeo "Como começar" — contextualizado ── */}
      {summary.onboardingVideo && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={tr(0.12)}
          aria-label="Guia de início"
        >
          <div className="mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-accent">Guia de início</p>
            <h2 className="text-sm font-bold text-ink-primary">Como começar no PDC</h2>
          </div>
          <div className="rounded-lg overflow-hidden bg-elevated border border-border max-w-4xl mx-auto">
            <div
              className="relative flex items-center justify-center"
              style={{ aspectRatio: '16/8' }}
            >
              {summary.onboardingVideo.thumbnailUrl ? (
                <img
                  src={summary.onboardingVideo.thumbnailUrl}
                  alt="Como começar no PDC"
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-canvas to-elevated" />
              )}
              <a
                href={summary.onboardingVideo.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Reproduzir vídeo"
                className="relative flex h-14 w-14 items-center justify-center rounded-full bg-accent/90 backdrop-blur-sm transition-transform hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent shadow-lg"
              >
                <PlayCircle size={28} className="text-white ml-0.5" strokeWidth={1.5} />
              </a>
              {summary.onboardingVideo.duracaoSegundos > 0 && (
                <div className="absolute bottom-3 right-3 rounded-md px-2 py-0.5 text-[11px] font-bold tabular-nums bg-black/70 text-white backdrop-blur-sm">
                  {String(Math.floor(summary.onboardingVideo.duracaoSegundos / 60))}:
                  {String(summary.onboardingVideo.duracaoSegundos % 60).padStart(2, '0')}
                </div>
              )}
            </div>
          </div>
        </motion.section>
      )}

    </div>
  );
}

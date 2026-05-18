import { Link } from 'react-router-dom';
import { ChevronRight, Compass } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { APPLE_SPRING } from '@/lib/animations';
import type { HomeSummary, Role } from '@pdc/shared';
import {
  TrendingCard, CourseActivityRow, SimActivityRow, SectionHeader,
} from './HomeContentCards';

const NO_MOTION = { duration: 0 } as const;

interface Props {
  summary: HomeSummary;
  role: Role;
}

export function HomeMainColumn({ summary }: Props) {
  const reduced = useReducedMotion();
  const tr = (delay = 0) => reduced ? NO_MOTION : { ...APPLE_SPRING, delay };

  const recentCursos  = summary.recentActivitiesCursos;
  const recentSims    = summary.recentActivitiesSimulacoes;
  const aprenderAgora = summary.aprenderAgora;
  const trending      = summary.trendingComunidade;
  const hasRecent     = recentCursos.length > 0 || recentSims.length > 0;

  return (
    <div className="space-y-10">

      {/* ── Widgets inline — apenas mobile (lg:hidden) ── */}
      <div className="lg:hidden space-y-3">
        {summary.nextDirective && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={tr(0.12)}
          >
            <Link to={summary.nextDirective.to} className="block group">
              <div className="flex items-center gap-3 rounded-lg bg-elevated border border-border p-4 transition-colors active:bg-elevated/80">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary mb-0.5">Próximo passo</p>
                  <p className="text-sm font-semibold text-ink-primary leading-snug truncate">{summary.nextDirective.label}</p>
                </div>
                <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-accent/10 text-accent shrink-0">
                  <ChevronRight size={16} />
                </span>
              </div>
            </Link>
          </motion.div>
        )}
        {(summary.stats.xp !== undefined || summary.stats.reputacao > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={tr(0.14)}
            className="flex gap-3"
          >
            {summary.stats.xp !== undefined && (
              <div className="flex-1 rounded-lg bg-elevated border border-border p-3 text-center">
                <p className="text-lg font-bold text-ink-primary tabular-nums">{summary.stats.xp.toLocaleString('pt-AO')}</p>
                <p className="text-[10px] text-ink-tertiary mt-0.5">XP</p>
              </div>
            )}
            {summary.stats.reputacao > 0 && (
              <div className="flex-1 rounded-lg bg-elevated border border-border p-3 text-center">
                <p className="text-lg font-bold text-ink-primary tabular-nums">{summary.stats.reputacao}</p>
                <p className="text-[10px] text-ink-tertiary mt-0.5">Reputação</p>
              </div>
            )}
            {summary.stats.pendingActions > 0 && (
              <div className="flex-1 rounded-lg bg-elevated border border-border p-3 text-center">
                <p className="text-lg font-bold text-accent tabular-nums">{summary.stats.pendingActions}</p>
                <p className="text-[10px] text-ink-tertiary mt-0.5">Pendentes</p>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* ── Continua de onde paraste ── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={tr(0.14)}
        aria-label="Actividades recentes"
      >
        <SectionHeader title="Continua de onde paraste" viewAllTo="/app/cursos" />
        {hasRecent ? (
          <div className="space-y-3">
            {recentCursos.map((item) => (
              <CourseActivityRow key={item.inscricaoId} item={item} />
            ))}
            {recentSims.map((item) => (
              <SimActivityRow key={item.tentativaId} item={item} />
            ))}
          </div>
        ) : (
          <div className="py-8 flex flex-col items-center gap-4 text-center">
            <Compass size={28} className="text-ink-tertiary" strokeWidth={1.4} />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-ink-primary">Ainda não começaste nada</p>
              <p className="text-xs text-ink-secondary">Explora os conteúdos disponíveis e inicia a tua jornada.</p>
            </div>
            <Link to="/app/explorar">
              <Button variant="primary" size="sm">Explorar conteúdos</Button>
            </Link>
          </div>
        )}
      </motion.section>

      {/* ── Aprender agora ── */}
      {aprenderAgora.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={tr(0.26)}
          aria-label="Aprender agora"
        >
          <SectionHeader title="Aprender agora" viewAllTo="/app/explorar" />
          {/* Carousel horizontal no mobile, grid no desktop */}
          <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3">
              {aprenderAgora.slice(0, 6).map((item) => (
                <div key={`${item.tipo}-${item.id}`} className="snap-start shrink-0 w-[220px] sm:w-auto">
                  <TrendingCard item={item} />
                </div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* ── Comunidade em destaque ── */}
      {trending.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={tr(0.32)}
          aria-label="Comunidade em destaque"
        >
          <SectionHeader title="Comunidade em destaque" viewAllTo="/app/feed" />
          <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3">
              {trending.slice(0, 6).map((item) => (
                <div key={`${item.tipo}-${item.id}`} className="snap-start shrink-0 w-[220px] sm:w-auto">
                  <TrendingCard item={item} />
                </div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

    </div>
  );
}

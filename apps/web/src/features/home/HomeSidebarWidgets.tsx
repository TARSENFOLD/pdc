import { Link } from 'react-router-dom';
import { ArrowRight, Info } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { APPLE_SPRING } from '@/lib/animations';
import type { HomeSummary } from '@pdc/shared';

const NO_MOTION = { duration: 0 } as const;

interface Props {
  summary: HomeSummary;
}

function StatBig({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center gap-0.5 flex-1 py-3">
      <span className="text-2xl font-bold text-ink-primary tabular-nums leading-none">{value}</span>
      <span className="text-[10px] font-medium text-ink-tertiary">{label}</span>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-xs text-ink-tertiary">{label}</span>
      <span className="text-sm font-bold text-ink-primary tabular-nums">{value}</span>
    </div>
  );
}

export function HomeSidebarWidgets({ summary }: Props) {
  const reduced = useReducedMotion();
  const tr = reduced ? NO_MOTION : APPLE_SPRING;
  const { stats, nextDirective, socialPulse } = summary;

  const xpValue = stats.xp ?? 0;
  const canCalculateScores = stats.xp !== undefined && stats.reputacao > 0;
  const fluidity = canCalculateScores ? (xpValue / 100).toFixed(2) : null;
  const resilience = canCalculateScores ? (stats.reputacao / 100).toFixed(2) : null;

  return (
    <aside className="flex flex-col gap-5 sticky top-8 w-full">

      {/* ── Widget 0: Career Readiness (φ/R) — estilo Springpod ── */}
      {canCalculateScores && (
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...tr, delay: 0.05 }}
          className="rounded-xl bg-elevated border border-border p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary">
              Career Readiness
            </p>
            <Info size={12} className="text-ink-tertiary" />
          </div>
          <p className="text-xs text-ink-secondary mb-4 leading-relaxed">
            Descobre o teu potencial de carreira com base na tua fluidez e resiliência na plataforma.
          </p>
          <div className="flex gap-4 mb-4">
            <div className="flex-1 text-center p-3 rounded-lg bg-canvas">
              <p className="text-2xl font-bold text-ink-primary tabular-nums">{fluidity}</p>
              <p className="text-[10px] text-ink-tertiary mt-0.5">Fluidez φ</p>
            </div>
            <div className="flex-1 text-center p-3 rounded-lg bg-canvas">
              <p className="text-2xl font-bold text-ink-primary tabular-nums">{resilience}</p>
              <p className="text-[10px] text-ink-tertiary mt-0.5">Resiliência R</p>
            </div>
          </div>
          <Link to="/app/dashboard/estudante">
            <div className="w-full py-2.5 px-4 rounded-lg bg-accent text-white text-xs font-semibold text-center transition-colors hover:bg-accent/90">
              Ver análise completa
            </div>
          </Link>
        </motion.div>
      )}

      {/* ── Widget 1: Stats — sempre visível ── */}
      <motion.div
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ ...tr, delay: 0.1 }}
        className="rounded-lg bg-elevated border border-border p-4"
      >
        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary mb-1">
          O teu perfil
        </p>
        {/* Números grandes — XP e Reputação em destaque */}
        <div className="flex divide-x divide-border mb-2">
          {stats.xp !== undefined && (
            <StatBig label="XP" value={stats.xp.toLocaleString('pt-AO')} />
          )}
          <StatBig label="Reputação" value={stats.reputacao} />
          {stats.conquistasCount !== undefined && stats.conquistasCount > 0 && (
            <StatBig label="Conquistas" value={stats.conquistasCount} />
          )}
        </div>
        {/* Valores secundários como rows */}
        {stats.vinkulosCount !== undefined && stats.vinkulosCount > 0 && (
          <StatRow label="Vínculos" value={stats.vinkulosCount} />
        )}
        {stats.activeStudents !== undefined && stats.activeStudents > 0 && (
          <StatRow label="Alunos activos" value={stats.activeStudents} />
        )}
        {stats.activePrograms !== undefined && stats.activePrograms > 0 && (
          <StatRow label="Programas" value={stats.activePrograms} />
        )}
        {stats.pendingActions > 0 && (
          <StatRow label="Acções pendentes" value={stats.pendingActions} />
        )}
      </motion.div>

      {/* ── Widget 2: Next Directive ── */}
      {nextDirective && (
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...tr, delay: 0.18 }}
        >
          <Link to={nextDirective.to} className="block group">
            <div className="rounded-lg bg-elevated border border-border p-4 transition-colors hover:bg-elevated/80">
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary mb-1">
                Próximo passo
              </p>
              <p className="text-sm font-semibold text-ink-primary leading-snug mb-1">
                {nextDirective.label}
              </p>
              <p className="text-xs text-ink-secondary leading-relaxed mb-3">
                {nextDirective.description}
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent">
                Continuar <ArrowRight size={12} />
              </span>
            </div>
          </Link>
        </motion.div>
      )}

      {/* ── Widget 3: Métricas φ / R ── */}
      {stats.xp !== undefined && stats.reputacao > 0 && (
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...tr, delay: 0.24 }}
          className="rounded-lg bg-elevated border border-border p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary">
              Métricas comportamentais
            </p>
            <span title="Calculadas a partir do teu comportamento real na plataforma" className="cursor-help">
              <Info size={12} className="text-ink-tertiary" />
            </span>
          </div>
          <div className="flex gap-4">
            <div className="flex-1 text-center py-2 rounded-md bg-canvas">
              <p className="text-xl font-bold text-ink-primary tabular-nums">
                {(stats.xp / 100).toFixed(2)}
              </p>
              <p className="text-[10px] text-ink-tertiary mt-0.5">Fluidez φ</p>
            </div>
            <div className="flex-1 text-center py-2 rounded-md bg-canvas">
              <p className="text-xl font-bold text-ink-primary tabular-nums">
                {(stats.reputacao / 100).toFixed(2)}
              </p>
              <p className="text-[10px] text-ink-tertiary mt-0.5">Resiliência R</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Widget 4: Social Pulse ── */}
      {socialPulse.length > 0 && (
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...tr, delay: 0.3 }}
          className="rounded-lg bg-elevated border border-border p-4"
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary mb-3">
            Actividade recente
          </p>
          <div className="space-y-0">
            {socialPulse.slice(0, 3).map((pulse) => (
              <div key={pulse.id} className="py-2.5 border-b border-border last:border-0">
                <p className="text-xs text-ink-secondary leading-snug">{pulse.message}</p>
                <p className="text-[10px] text-ink-tertiary mt-0.5">{pulse.timestamp}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

    </aside>
  );
}

import { useAuth } from '@/lib/auth/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Spinner, Button, GlassCard } from '@/components/ui';
import { QuietHero, QuietStat, QuietCard, QuietEmpty, QuietSection } from '@/components/ui/quiet';
import { RoleDashboardShell } from '@/components/ui/shells';
import { BookOpen, Zap, Star, Trophy, UserCheck, Brain, Target, ChevronRight } from 'lucide-react';
import { http } from '@/lib/api/http';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import type { DashboardEstudante } from '@pdc/shared';

const SPRING = { type: 'spring', stiffness: 220, damping: 28 } as const;

const EMPTY: DashboardEstudante = {
  stats: { xp: 0, reputacao: 0, conquistasCount: 0, vinkulosCount: 0, pulseVariacao: null },
  match: { area: 'Tecnologia', score: 0, insight: '', directive: 'PERFIL PENDENTE' },
  behavior: null,
  progressoCursos: [],
  proximaAcao: { label: 'Completar Perfil', to: '/app/perfil-vocacional' },
  insightsTina: [],
};

export function EstudanteDashboard() {
  const { user } = useAuth();
  const { t } = useTranslation('dashboard');

  const { data: dash, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard', 'estudante'],
    queryFn: () => http.get<DashboardEstudante>('/dashboard/estudante'),
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas p-8 text-center">
        <p className="text-lg font-semibold text-ink-primary">{t('estudante.error.title')}</p>
        <Button variant="secondary" onClick={() => void refetch()}>
          {t('estudante.error.retry')}
        </Button>
      </div>
    );
  }

  const d = dash ?? EMPTY;
  const { stats, behavior, progressoCursos, match, proximaAcao, insightsTina } = d;
  const firstName = user?.nome.split(' ')[0] ?? 'Talento';

  /* ── Slots ── */

  const hero = (
    <QuietHero
      kicker={t('estudante.hero.kicker')}
      title={`${t('estudante.hero.title')}, ${firstName}.`}
      description={t('estudante.hero.description')}
      actions={
        <Link to={proximaAcao.to} data-testid="primary-cta">
          <Button variant="primary" size="md">
            {proximaAcao.label} <ChevronRight size={16} className="ml-1" />
          </Button>
        </Link>
      }
    />
  );

  const kpiStrip = [
    <QuietStat
      key="xp"
      data-testid="kpi-xp"
      label={t('estudante.kpi.xp')}
      value={stats.xp}
      icon={Zap}
      href="/app/perfil-vocacional"
    />,
    <QuietStat
      key="reputacao"
      data-testid="kpi-reputacao"
      label={t('estudante.kpi.reputacao')}
      value={stats.reputacao}
      icon={Star}
      href="/app/reputacao"
    />,
    <QuietStat
      key="conquistas"
      data-testid="kpi-conquistas"
      label={t('estudante.kpi.conquistas')}
      value={stats.conquistasCount}
      icon={Trophy}
      href="/app/conquistas"
    />,
    <QuietStat
      key="vinculos"
      data-testid="kpi-vinculos"
      label={t('estudante.kpi.vinculos')}
      value={stats.vinkulosCount}
      icon={UserCheck}
      href="/app/vinculos"
    />,
  ];

  const primary = (
    <QuietCard padding="lg" className="h-full space-y-5">
      {behavior ? (
        <>
          <QuietSection kicker={t('estudante.sections.behavior_kicker')} title={t('estudante.sections.behavior_title')}>
            <div className="grid grid-cols-3 gap-4 mt-2">
              {[
                { key: 'fluidez', val: behavior.fluidez },
                { key: 'resiliencia', val: behavior.resiliencia },
                { key: 'foco', val: behavior.foco },
              ].map(({ key, val }) => (
                <div key={key} className="text-center space-y-1 p-3 rounded-md bg-recessed">
                  <p className="text-xs text-ink-tertiary">{t(`estudante.behavior.${key}`)}</p>
                  <p className="text-xl font-mono font-semibold text-ink-primary">{val.toFixed(2)}</p>
                </div>
              ))}
            </div>
            <Link
              to="/app/perfil-vocacional"
              className="inline-flex items-center gap-1 text-xs text-ink-tertiary hover:text-accent transition-colors mt-3 min-h-[44px]"
            >
              {t('estudante.actions.ver_relatorio')} <ChevronRight size={14} />
            </Link>
          </QuietSection>
        </>
      ) : match.score > 0 ? (
        <QuietSection kicker={t('estudante.sections.match_kicker')} title={match.area}>
          <p className="text-sm text-ink-secondary">{match.insight}</p>
          <p className="text-2xl font-mono font-semibold text-ink-primary mt-2">
            {match.score}% <span className="text-sm font-sans font-normal text-ink-tertiary">{t('estudante.match.authority_label')}</span>
          </p>
        </QuietSection>
      ) : (
        <QuietEmpty
          icon={Target}
          message={match.insight || t('estudante.empty.match')}
          action={{ label: proximaAcao.label, to: proximaAcao.to }}
        />
      )}
    </QuietCard>
  );

  const hasTinaInsights = insightsTina.length > 0;
  const side = (
    <div className="space-y-4">
      <QuietCard padding="md" className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          {t('estudante.sections.side_title')}
        </p>
        <p className="text-sm text-ink-secondary leading-relaxed">{proximaAcao.label}</p>
        <Link to={proximaAcao.to} className="text-sm font-medium text-accent hover:underline flex items-center gap-1 min-h-[44px]">
          {proximaAcao.label} <ChevronRight size={14} />
        </Link>
      </QuietCard>
      {hasTinaInsights && (
        <GlassCard halo className="space-y-3">
          <div className="flex items-center gap-2">
            <Brain size={16} className="text-accent shrink-0" />
            <p className="text-xs font-semibold uppercase tracking-widest text-accent">
              {t('estudante.match.insights_label')}
            </p>
          </div>
          {insightsTina.map((insight, idx) => (
            <p key={idx} className="text-sm text-ink-secondary italic leading-relaxed">
              "{insight}"
            </p>
          ))}
        </GlassCard>
      )}
    </div>
  );

  const activity = (
    <QuietSection
      kicker={t('estudante.sections.cursos_kicker')}
      title={t('estudante.sections.cursos_title')}
      action={{ label: t('estudante.actions.ver_catalogo'), to: '/app/cursos' }}
    >
      {progressoCursos.length === 0 ? (
        <QuietEmpty
          icon={BookOpen}
          message={t('estudante.empty.cursos')}
          action={{ label: t('estudante.actions.explorar_cursos'), to: '/app/cursos' }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {progressoCursos.map((curso) => (
            <QuietCard key={curso.id} padding="md" className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-recessed flex items-center justify-center text-accent border border-ink-tertiary/10 shrink-0">
                  <BookOpen size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-primary truncate">{curso.titulo}</p>
                  <p className="text-xs text-ink-tertiary">{t('estudante.curso.certificacao')}</p>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-ink-tertiary">
                  <span>{t('estudante.curso.progresso')}</span>
                  <span className="font-mono">{curso.progresso}%</span>
                </div>
                <div className="h-1.5 w-full bg-recessed rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${String(curso.progresso)}%` }}
                    transition={SPRING}
                    className="h-full bg-accent rounded-full"
                  />
                </div>
              </div>
            </QuietCard>
          ))}
        </div>
      )}
    </QuietSection>
  );

  return (
    <RoleDashboardShell
      hero={hero}
      kpiStrip={kpiStrip}
      primary={primary}
      side={side}
      activity={activity}
    />
  );
}

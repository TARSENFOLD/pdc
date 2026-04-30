import { useAuth } from '@/lib/auth/AuthContext';
import { Link } from 'react-router-dom';
import { Card, Spinner } from '@/components/ui';
import {
  BookOpen, FlaskConical, Trophy, Star, Zap,
  PenSquare, Users, Shield, Building2, Microscope,
  BarChart3, ChevronRight,
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import type { Role } from '@pdc/shared';
import { useTranslation } from '@/hooks/useTranslation';

interface QuickActionDef {
  labelKey: string;
  to: string;
  icon: React.ElementType;
  descKey: string;
}

const ACTIONS_BY_ROLE: Record<Role, QuickActionDef[]> = {
  estudante: [
    { labelKey: 'home.actions.estudante.perfil_label', to: '/app/perfil-vocacional', icon: Star, descKey: 'home.actions.estudante.perfil_desc' },
    { labelKey: 'home.actions.estudante.simulacoes_label', to: '/app/simulacoes', icon: FlaskConical, descKey: 'home.actions.estudante.simulacoes_desc' },
    { labelKey: 'home.actions.estudante.cursos_label', to: '/app/cursos', icon: BookOpen, descKey: 'home.actions.estudante.cursos_desc' },
    { labelKey: 'home.actions.estudante.ranking_label', to: '/app/ranking', icon: Trophy, descKey: 'home.actions.estudante.ranking_desc' },
  ],
  mentor: [
    { labelKey: 'home.actions.mentor.criar_label', to: '/app/mentor/cursos/criar', icon: PenSquare, descKey: 'home.actions.mentor.criar_desc' },
    { labelKey: 'home.actions.mentor.cursos_label', to: '/app/mentor/cursos', icon: BookOpen, descKey: 'home.actions.mentor.cursos_desc' },
    { labelKey: 'home.actions.mentor.simulacoes_label', to: '/app/mentor/simulacoes', icon: FlaskConical, descKey: 'home.actions.mentor.simulacoes_desc' },
    { labelKey: 'home.actions.mentor.mentorados_label', to: '/app/mentor/mentorados', icon: Users, descKey: 'home.actions.mentor.mentorados_desc' },
  ],
  instituicao: [
    { labelKey: 'home.actions.instituicao.experiencias_label', to: '/app/instituicao/experiencias', icon: Building2, descKey: 'home.actions.instituicao.experiencias_desc' },
    { labelKey: 'home.actions.instituicao.programas_label', to: '/app/instituicao/programas', icon: BookOpen, descKey: 'home.actions.instituicao.programas_desc' },
    { labelKey: 'home.actions.instituicao.estudantes_label', to: '/app/instituicao/estudantes-vinculados', icon: Users, descKey: 'home.actions.instituicao.estudantes_desc' },
    { labelKey: 'home.actions.instituicao.relatorios_label', to: '/app/instituicao/relatorios', icon: BarChart3, descKey: 'home.actions.instituicao.relatorios_desc' },
  ],
  moderador: [
    { labelKey: 'home.actions.moderador.aprovacoes_label', to: '/app/moderacao/aprovacoes', icon: Shield, descKey: 'home.actions.moderador.aprovacoes_desc' },
    { labelKey: 'home.actions.moderador.denuncias_label', to: '/app/moderacao/denuncias', icon: Shield, descKey: 'home.actions.moderador.denuncias_desc' },
    { labelKey: 'home.actions.moderador.utilizadores_label', to: '/app/moderador/utilizadores', icon: Users, descKey: 'home.actions.moderador.utilizadores_desc' },
    { labelKey: 'home.actions.moderador.stats_label', to: '/app/admin/stats', icon: BarChart3, descKey: 'home.actions.moderador.stats_desc' },
  ],
  comite_cientifico: [
    { labelKey: 'home.actions.comite_cientifico.validacao_label', to: '/app/comite/validacao', icon: Microscope, descKey: 'home.actions.comite_cientifico.validacao_desc' },
    { labelKey: 'home.actions.comite_cientifico.dashboard_label', to: '/app/comite', icon: BarChart3, descKey: 'home.actions.comite_cientifico.dashboard_desc' },
    { labelKey: 'home.actions.comite_cientifico.feed_label', to: '/app/feed', icon: Zap, descKey: 'home.actions.comite_cientifico.feed_desc' },
  ],
  super_admin: [
    { labelKey: 'home.actions.super_admin.stats_label', to: '/app/admin/stats', icon: BarChart3, descKey: 'home.actions.super_admin.stats_desc' },
    { labelKey: 'home.actions.super_admin.utilizadores_label', to: '/app/admin/utilizadores', icon: Users, descKey: 'home.actions.super_admin.utilizadores_desc' },
    { labelKey: 'home.actions.super_admin.flags_label', to: '/app/admin/feature-flags', icon: Shield, descKey: 'home.actions.super_admin.flags_desc' },
    { labelKey: 'home.actions.super_admin.feed_weights_label', to: '/app/admin/feed-weights', icon: Zap, descKey: 'home.actions.super_admin.feed_weights_desc' },
  ],
  patrocinador: [
    { labelKey: 'home.actions.patrocinador.feed_label', to: '/app/feed', icon: Zap, descKey: 'home.actions.patrocinador.feed_desc' },
    { labelKey: 'home.actions.patrocinador.explorar_label', to: '/app/explorar', icon: Building2, descKey: 'home.actions.patrocinador.explorar_desc' },
  ],
};

export default function HomePage(): React.ReactNode {
  const { user, isLoading } = useAuth();
  const { t } = useTranslation('dashboard');

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas">
        <Spinner size="lg" />
      </div>
    );
  }

  const role = user?.role ?? 'estudante';
  const actionDefs = ACTIONS_BY_ROLE[role];
  const firstName = user?.nome ? String(user.nome.split(' ')[0]) : null;

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-16 animate-in fade-in duration-500">
      <header className="space-y-1">
        <p className="text-xs font-medium text-ink-tertiary uppercase tracking-widest">
          {role.replace('_', ' ')}
        </p>
        <h1 className="text-2xl font-bold text-ink-primary" data-testid="page-hero-title">
          {firstName
            ? `${t('home.greeting_prefix')}, ${firstName}`
            : t('home.welcome_fallback')}
        </h1>
        <p className="text-sm text-ink-secondary leading-relaxed">
          {t(`home.greetings.${role}`)}
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {actionDefs.map((action, idx) => (
          <motion.div
            key={action.to}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.06, type: 'spring', stiffness: 220, damping: 28 }}
            className={idx === 0 ? 'sm:col-span-2 lg:col-span-2' : ''}
          >
            <Link to={action.to} className="block h-full">
              <Card
                interactive
                className={cn(
                  'h-full p-6 flex flex-col gap-4 transition-all group',
                  idx === 0
                    ? 'bg-accent border-accent/50 hover:bg-accent/90 min-h-[120px]'
                    : 'border-white/5 bg-elevated/50 hover:border-accent/20',
                )}
              >
                <div
                  className={cn(
                    'p-3 rounded-2xl w-fit group-hover:scale-110 transition-transform',
                    idx === 0
                      ? 'bg-white/15 text-white'
                      : 'bg-accent/5 text-accent',
                  )}
                >
                  <action.icon size={22} />
                </div>
                <div className="flex-1">
                  <h3
                    className={cn(
                      'font-semibold transition-colors',
                      idx === 0
                        ? 'text-white'
                        : 'text-ink-primary group-hover:text-accent',
                    )}
                  >
                    {t(action.labelKey)}
                  </h3>
                  <p
                    className={cn(
                      'text-xs mt-1 leading-relaxed',
                      idx === 0 ? 'text-white/70' : 'text-ink-tertiary',
                    )}
                  >
                    {t(action.descKey)}
                  </p>
                </div>
                <div
                  className={cn(
                    'flex items-center text-[10px] font-semibold uppercase tracking-widest',
                    idx === 0
                      ? 'text-white/60'
                      : 'text-ink-tertiary group-hover:text-accent',
                  )}
                >
                  {t('home.cta_open')} <ChevronRight size={12} className="ml-1" />
                </div>
              </Card>
            </Link>
          </motion.div>
        ))}
      </section>

      <footer className="flex items-center gap-2 opacity-40">
        <Zap size={11} className="text-accent shrink-0" />
        <p className="text-[11px] text-ink-tertiary">
          {t('home.oracle_body')}
        </p>
      </footer>
    </div>
  );
}

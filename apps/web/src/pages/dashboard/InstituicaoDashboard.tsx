import { useAuth } from '@/lib/auth/auth-context';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { experienciasApi } from '@/lib/api/experiencias';
import { Spinner, BentoGrid, BentoTile, GlassCard, AsymmetricButton, EmptyState } from '@/components/ui';
import ContentTypeCTAGrid from '@/components/dashboard/ContentTypeCTAGrid';
import {
  Building2,
  ClipboardList,
  MapPin,
  Briefcase,
  MessageSquare,
  Trophy,
  Palette,
  Search,
  ShieldCheck,
  FlaskConical,
  FolderKanban,
} from 'lucide-react';
import { motion } from 'motion/react';

const CTAS = [
  { label: 'Criar Experiência', to: '/app/instituicao/criar-experiencia', icon: Building2, variant: 'primary' as const },
  { label: 'Criar Programa', to: '/app/instituicao/criar-programa', icon: Briefcase },
  { label: 'Criar Curso', to: '/app/instituicao/cursos/criar', icon: ShieldCheck },
  { label: 'Criar Simulação', to: '/app/instituicao/simulacoes/criar', icon: FlaskConical },
  { label: 'Criar Projeto', to: '/app/projetos/novo', icon: FolderKanban },
  { label: 'Criar Post', to: '/app/feed/criar', icon: MessageSquare },
  { label: 'Registar Marco', to: '/app/conquistas/criar', icon: Trophy },
  { label: 'Perfil institucional', to: '/app/instituicao/perfil/identidade', icon: Palette },
  { label: 'Match Terminal', to: '/app/instituicao/propostas', icon: Search },
];

export function InstituicaoDashboard() {
  const { user } = useAuth();
  const ctas = user?.role === 'instituicao'
    ? CTAS
    : CTAS.filter((cta) => cta.to !== '/app/instituicao/perfil/identidade');

  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['experiencias', 'stats'],
    queryFn: () => experienciasApi.getStats(),
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
      <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-6">
        <EmptyState
          icon={Building2}
          variant="error"
          title="Não foi possível carregar as métricas"
          description="Tenta novamente mais tarde."
        />
      </div>
    );
  }

  const formatTotal = (value: number | null | undefined): number | string => (
    value === null || value === undefined ? 'Sem dados suficientes' : value
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto"
    >
      <header>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-institutional-cobalt/10 border border-institutional-cobalt/20 text-institutional-cobalt text-[10px] font-black uppercase tracking-widest mb-4">
          <ShieldCheck size={12} /> Painel Institucional
        </div>
        <h1 className="text-4xl font-black text-ink-primary tracking-tighter sm:text-5xl font-display">
          {user?.nome ?? 'Instituição'}<span className="text-accent">.</span>
        </h1>
        <p className="text-ink-secondary mt-2 text-lg">
          Gere o vosso ecossistema de oportunidades e talentos.
        </p>
      </header>

      <BentoGrid>
        {/* Tile KPIs 2×2 */}
        <BentoTile size="2x2" asymmetric className="relative overflow-hidden">
          <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-accent/5 blur-[80px] pointer-events-none" />
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-ink-tertiary mb-4 flex items-center gap-2 relative z-10">
            <Building2 size={14} className="text-accent" /> Métricas de Impacto
          </h2>
          <div className="grid grid-cols-2 gap-4 flex-1 relative z-10">
            <GlassCard className="flex flex-col justify-between p-4">
              <ClipboardList size={18} className="text-accent mb-2" />
              <div>
                <p className="text-[9px] font-black text-ink-tertiary uppercase tracking-widest">Conteúdos</p>
                <p className="text-3xl font-black font-mono text-ink-primary">
                  {formatTotal(stats?.conteudosTotais)}
                </p>
              </div>
            </GlassCard>
            <GlassCard className="flex flex-col justify-between p-4">
              <MapPin size={18} className="text-accent mb-2" />
              <div>
                <p className="text-[9px] font-black text-ink-tertiary uppercase tracking-widest">Participações</p>
                <p className="text-3xl font-black font-mono text-ink-primary">
                  {formatTotal(stats?.participacoesTotais)}
                </p>
              </div>
            </GlassCard>
            <GlassCard className="col-span-2 flex items-center justify-between p-4">
              <div>
                <p className="text-[9px] font-black text-ink-tertiary uppercase tracking-widest">Inscrições Totais</p>
                <p className="text-3xl font-black font-mono text-ink-primary">
                  {formatTotal(stats?.inscricoesTotais)}
                </p>
              </div>
              <Building2 size={32} className="text-accent/20" />
            </GlassCard>
          </div>
          <Link to="/app/instituicao/criar-experiencia" className="mt-4 block relative z-10">
            <AsymmetricButton className="w-full h-12 font-black uppercase tracking-widest text-[10px]">
              Criar Experiência
            </AsymmetricButton>
          </Link>
        </BentoTile>

        {/* Tile CTAs 2×2 */}
        <BentoTile size="2x2" className="flex flex-col">
          <ContentTypeCTAGrid
            title="Criar Conteúdo"
            ctas={ctas}
            gridCols={2}
            className="flex-1"
          />
        </BentoTile>
      </BentoGrid>

      {/* Match Terminal destaque */}
      <GlassCard className="border-accent/10 flex items-center gap-4 p-5">
        <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent shrink-0">
          <Search size={20} />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-ink-tertiary">Match Terminal</p>
          <p className="text-sm text-ink-secondary">
            Consulta os estudantes que melhor se adequam ao vosso perfil institucional.
          </p>
        </div>
      </GlassCard>
    </motion.div>
  );
}

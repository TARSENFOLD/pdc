import { useAuth } from '@/lib/auth/auth-context';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { dashboardApi } from '@/lib/api/dashboard';
import {
  Badge,
  AspirationalEmpty,
  AsymmetricButton,
  BentoGrid,
  BentoTile,
  GlassCard
} from '@/components/ui';
import { RoleDashboardShellSkeleton } from '@/components/dashboard/RoleDashboardShellSkeleton';
import ContentTypeCTAGrid from '@/components/dashboard/ContentTypeCTAGrid';
import {
  Users,
  Brain,
  Activity,
  ChevronRight,
  ShieldCheck,
  Zap,
  Clock,
  BookOpen,
  Upload,
  MessageSquare,
  Trophy,
  LayoutDashboard,
  FolderKanban
} from 'lucide-react';
import { motion } from 'motion/react';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

export function MentorDashboard() {
  const { user } = useAuth();

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard', 'mentor'],
    queryFn: () => dashboardApi.getMentor(),
  });
  const patterns = dashboard?.patterns ?? [];

  if (isLoading) return <RoleDashboardShellSkeleton />;

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto"
    >
      {/* Header Soberano */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-bold uppercase tracking-widest mb-4">
             <ShieldCheck size={12} /> Painel de Decisão do Mentor
          </div>
          <h1 className="text-2xl font-bold text-ink-primary">
            Gestão de <span className="text-accent">Talentos.</span>
          </h1>
          <p className="text-ink-secondary mt-2 text-lg">Olá, {user?.nome}. Audita a biomecânica e o mérito dos teus orientandos.</p>
        </div>
        
        <div className="flex gap-3">
          <GlassCard halo className="px-6 py-3 rounded-2xl flex items-center gap-4 shadow-xl border-ink-tertiary/10">
            <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
              <Users size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-ink-tertiary font-bold uppercase tracking-widest">Total Talentos</span>
              <span className="font-mono font-bold text-2xl tracking-tighter text-ink-primary">{dashboard?.stats.totalTalentos ?? 0}</span>
            </div>
          </GlassCard>
        </div>
      </header>

      <BentoGrid>
        {/* CTAs — Criação de Conteúdo */}
        <BentoTile size="2x2" className="p-0 border-none bg-transparent shadow-none">
          <ContentTypeCTAGrid
            title="Ações Rápidas de Autoridade"
            className="h-full"
            gridCols={2}
            ctas={[
              { label: 'Criar Curso', to: '/app/mentor/cursos/criar', icon: BookOpen, variant: 'primary' },
              { label: 'Criar Laboratório', to: '/app/mentor/simulacoes/criar', icon: Brain, variant: 'primary' },
              { label: 'Criar Projeto', to: '/app/projetos/novo', icon: FolderKanban },
              { label: 'Criar Post', to: '/app/feed/criar', icon: MessageSquare },
              { label: 'Registar Marco', to: '/app/conquistas/criar', icon: Trophy },
              { label: 'Upload Conteúdo', to: '/app/mentor/upload', icon: Upload },
              { label: 'Ver Estudantes', to: '/app/mentor/mentorados', icon: Users },
            ]}
          />
        </BentoTile>

        {/* Resumo de Mérito Global */}
        <BentoTile size="1x1" className="bg-accent text-ink-on-accent flex flex-col justify-between p-6">
          <Trophy size={24} />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Mérito Médio</p>
            <p className="text-3xl font-bold font-mono tracking-tighter">
              {dashboard?.stats.meritoMedio.toFixed(1) ?? '0.0'}
            </p>
          </div>
        </BentoTile>

        {/* Auditoria de Músculo Cognitivo */}
        <BentoTile size="1x1" className="bg-recessed/30 flex flex-col justify-between p-6">
           <Activity size={24} className="text-accent" />
           <p className="text-xs font-bold text-ink-primary leading-tight font-display">
             A fluidez cognitiva média dos teus orientandos está estável.
           </p>
        </BentoTile>
      </BentoGrid>

      {/* Lista de Talentos */}
      <section className="space-y-6">
        <h2 className="font-bold text-ink-primary flex items-center gap-2 uppercase text-[12px] tracking-[0.2em]">
          <LayoutDashboard size={16} className="text-accent" /> Auditoria Detalhada
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {patterns.length === 0 ? (
            <AspirationalEmpty
              icon={Users}
              title="Aguardando Orientandos"
              description="Aguardando as primeiras simulações dos teus estudantes para gerar dados de mérito."
              className="col-span-full py-20"
            >
              <Link to="/app/mentor/mentorados">
                <AsymmetricButton className="h-12 px-8 font-bold uppercase tracking-widest text-[10px]">
                  Gerir Mentorias
                </AsymmetricButton>
              </Link>
            </AspirationalEmpty>
          ) : patterns.map((p) => (
            <motion.div key={p.perfil.id} variants={item}>
              <GlassCard className="p-6 border-ink-tertiary/10 hover:border-accent/20 transition-all group overflow-hidden relative rounded-xl">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-12 w-12 rounded-xl bg-accent text-ink-on-accent flex items-center justify-center font-bold text-xl shadow-lg shadow-accent/20">
                    {p.perfil.nome[0]}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-ink-primary truncate">{p.perfil.nome}</h3>
                    <div className="flex items-center gap-2 text-[10px] text-ink-tertiary font-bold uppercase tracking-widest">
                       <Clock size={10} /> {new Date(p.lastUpdatedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-ink-tertiary">
                      <Zap size={10} className="text-accent" /> Fluidez (\u03D5)
                    </div>
                    <span className="text-sm font-mono font-bold text-ink-primary">{p.cognitiveFluidity.toFixed(1)}</span>
                  </div>
                  <div className="h-1.5 w-full bg-recessed rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${String(p.cognitiveFluidity * 10)}%` }}
                      className="h-full bg-accent" 
                    />
                  </div>

                  <div className="flex justify-between items-end">
                    <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-ink-tertiary">
                      <Brain size={10} className="text-institutional-cobalt" /> Decisão
                    </div>
                    <span className="text-sm font-mono font-bold text-ink-primary">{(10 - p.hesitationIndex).toFixed(1)}</span>
                  </div>
                  <div className="h-1.5 w-full bg-recessed rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${String((10 - p.hesitationIndex) * 10)}%` }}
                      className="h-full bg-institutional-cobalt" 
                    />
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-ink-tertiary/10 flex items-center justify-between">
                  <Badge variant="secondary" className="bg-accent/5 text-accent border-accent/10 font-bold text-[9px]">
                    SCORE: {p.technicalScore.toFixed(1)}
                  </Badge>
                  <Link to={`/app/mentor/estudante/${p.perfil.id}`} className="text-accent flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest group-hover:gap-2 transition-all">
                    Ver Auditoria <ChevronRight size={14} />
                  </Link>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}

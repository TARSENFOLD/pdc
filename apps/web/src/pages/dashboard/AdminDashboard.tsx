import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { Spinner, BentoGrid, BentoTile } from '@/components/ui';
import { ContentTypeCTAGrid } from '@/components/dashboard/ContentTypeCTAGrid';
import {
  Users,
  Settings,
  BarChart2,
  Flag,
  Radio,
  FileText,
  Activity,
  BookOpen,
  AlertTriangle
} from 'lucide-react';
import { motion } from 'motion/react';

const ADMIN_CTAS = [
  { label: 'Utilizadores', to: '/app/admin/utilizadores', icon: Users, variant: 'primary' as const },
  { label: 'Feature Flags', to: '/app/admin/feature-flags', icon: Flag, variant: 'primary' as const },
  { label: 'Estatísticas', to: '/app/admin/stats', icon: BarChart2 },
  { label: 'Telemetria', to: '/app/admin/telemetria', icon: Radio },
  { label: 'Relatórios', to: '/app/admin/relatorios', icon: FileText },
  { label: 'Audit Trail', to: '/app/admin/audit', icon: Settings },
];

export function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi.getStats(),
  });

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-canvas"><Spinner size="lg" /></div>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto"
    >
      <header>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-black uppercase tracking-widest mb-4">
          <Settings size={12} /> Painel de Administração
        </div>
        <h1 className="text-4xl font-black text-ink-primary tracking-tighter sm:text-5xl font-display">
          Controlo <span className="text-accent">Total.</span>
        </h1>
        <p className="text-ink-secondary mt-2 text-lg">
          Supervisão global da plataforma, utilizadores e ecossistema.
        </p>
      </header>

      <BentoGrid>
        <BentoTile size="1x1" className="flex flex-col justify-between p-6 bg-accent/5 border-accent/10">
          <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
            <Users size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-ink-tertiary uppercase tracking-widest">Utilizadores</p>
            <p className="text-3xl font-black font-mono text-accent">{stats?.totalUtilizadores ?? 0}</p>
          </div>
        </BentoTile>

        <BentoTile size="1x1" className="flex flex-col justify-between p-6">
          <div className="h-10 w-10 rounded-xl bg-accent-success/10 flex items-center justify-center text-accent-success">
            <Activity size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-ink-tertiary uppercase tracking-widest">Simulações</p>
            <p className="text-3xl font-black font-mono text-ink-primary">{stats?.totalSimulacoes ?? 0}</p>
          </div>
        </BentoTile>

        <BentoTile size="1x1" className="flex flex-col justify-between p-6">
          <div className="h-10 w-10 rounded-xl bg-institutional-cobalt/10 flex items-center justify-center text-institutional-cobalt">
            <BookOpen size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-ink-tertiary uppercase tracking-widest">Cursos</p>
            <p className="text-3xl font-black font-mono text-ink-primary">{stats?.totalCursos ?? 0}</p>
          </div>
        </BentoTile>

        <BentoTile size="1x1" className="flex flex-col justify-between p-6 bg-accent-danger/5 border-accent-danger/10">
          <div className="h-10 w-10 rounded-xl bg-accent-danger/10 flex items-center justify-center text-accent-danger">
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-ink-tertiary uppercase tracking-widest">Denúncias</p>
            <p className="text-3xl font-black font-mono text-accent-danger">{stats?.denunciasPendentes ?? 0}</p>
          </div>
        </BentoTile>

        {/* ContentTypeCTAGrid para Operações Admin */}
        <BentoTile size="2x2" className="p-0 border-none bg-transparent shadow-none">
          <ContentTypeCTAGrid
            title="Consola de Gestão S.O."
            gridCols={2}
            className="h-full"
            ctas={ADMIN_CTAS}
          />
        </BentoTile>

        <BentoTile size="2x1" className="bg-recessed/30 p-8 flex flex-col justify-center gap-4">
           <h3 className="text-[10px] font-black text-ink-tertiary uppercase tracking-[0.3em] flex items-center gap-2">
             <Radio size={14} className="text-accent" /> Telemetria em Tempo Real
           </h3>
           <p className="text-sm text-ink-secondary leading-relaxed">
             O sistema está a processar {stats?.totalSimulacoes ?? 0} padrões de comportamento. Integridade do Oráculo em 99.9%.
           </p>
        </BentoTile>
      </BentoGrid>
    </motion.div>
  );
}

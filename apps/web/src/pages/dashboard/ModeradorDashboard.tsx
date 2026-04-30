import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { dashboardApi } from '@/lib/api/dashboard';
import { Badge, Spinner, BentoGrid, BentoTile, GlassCard } from '@/components/ui';
import ContentTypeCTAGrid from '@/components/dashboard/ContentTypeCTAGrid';
import { 
  ShieldAlert, 
  CheckCircle, 
  Users, 
  Clock, 
  AlertTriangle,
  ClipboardList,
  UserCheck
} from 'lucide-react';
import { motion } from 'motion/react';

export function ModeradorDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'moderador'],
    queryFn: () => dashboardApi.getModerador(),
  });

  const denuncias = data?.denunciasCriticas ?? [];

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-canvas"><Spinner size="lg" /></div>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto"
    >
      <header>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-bold uppercase tracking-widest mb-4">
          <ShieldAlert size={12} /> Painel de Moderação
        </div>
        <h1 className="text-4xl font-black text-ink-primary tracking-tighter sm:text-5xl font-display">
          Controlo de <span className="text-accent">Qualidade.</span>
        </h1>
        <p className="text-ink-secondary mt-2 text-lg">
          Fila de denúncias, aprovações pendentes e auditoria da plataforma.
        </p>
      </header>

      <BentoGrid>
        {/* Stat: Pendentes */}
        <BentoTile size="1x1" className="flex flex-col justify-between p-6 bg-accent/5 border-accent/10">
          <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-ink-tertiary uppercase tracking-widest">Denúncias Pendentes</p>
            <p className="text-3xl font-black font-mono text-accent">{data?.stats.denunciasPendentes ?? 0}</p>
          </div>
        </BentoTile>

        {/* Stat: Resolvidas hoje */}
        <BentoTile size="1x1" className="flex flex-col justify-between p-6">
          <div className="h-10 w-10 rounded-xl bg-accent-success/10 flex items-center justify-center text-accent-success">
            <CheckCircle size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-ink-tertiary uppercase tracking-widest">Resolvidas Hoje</p>
            <p className="text-3xl font-black font-mono text-ink-primary">{data?.stats.resolvidasHoje ?? 0}</p>
          </div>
        </BentoTile>

        {/* ContentTypeCTAGrid para Acções */}
        <BentoTile size="2x1" className="p-0 border-none bg-transparent shadow-none">
          <ContentTypeCTAGrid
            title="Operações de Integridade"
            gridCols={2}
            ctas={[
              { label: 'Fila de Aprovações', to: '/app/moderacao/aprovacoes', icon: UserCheck, variant: 'primary' },
              { label: 'Todas as Denúncias', to: '/app/moderacao/denuncias', icon: ShieldAlert },
              { label: 'Gestão de Utilizadores', to: '/app/moderador/utilizadores', icon: Users },
              { label: 'Audit Trail', to: '/app/admin/audit', icon: ClipboardList },
            ]}
          />
        </BentoTile>
      </BentoGrid>

      {/* Fila de denúncias */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-black text-ink-primary flex items-center gap-2 uppercase text-[12px] tracking-[0.2em]">
            <Clock size={16} className="text-accent" /> Denúncias Críticas
          </h2>
          <Link to="/app/moderacao/denuncias" className="text-[10px] font-black text-accent hover:underline uppercase tracking-widest">
            Ver todas →
          </Link>
        </div>

        {denuncias.length === 0 ? (
          <GlassCard className="py-12 text-center">
            <p className="text-sm text-ink-tertiary">Nenhuma denúncia pendente. A plataforma está estável.</p>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {denuncias.map((d) => (
              <Link
                key={d.id}
                to={`/app/moderacao/denuncias/${d.id}`}
                className="group"
              >
                <GlassCard className="flex items-start justify-between gap-4 p-4 hover:border-accent/20 transition-all">
                  <div className="min-w-0">
                    <p className="text-[9px] text-ink-tertiary mb-1 font-bold uppercase tracking-widest">
                      {d.conteudoTipo} · {new Date(d.criadaEm).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-ink-primary line-clamp-1 font-medium group-hover:text-accent transition-colors">{d.motivo}</p>
                  </div>
                  <Badge variant="warning">Pendente</Badge>
                </GlassCard>
              </Link>
            ))}
          </div>
        )}
      </section>
    </motion.div>
  );
}

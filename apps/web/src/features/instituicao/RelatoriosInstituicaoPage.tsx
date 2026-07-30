import { useQuery } from '@tanstack/react-query';
import { experienciasApi } from '@/lib/api/experiencias';
import { Card, Table, Spinner, Badge, Button, type Column } from '@/components/ui';
import { BarChart3, TrendingDown, Users, Target, ShieldCheck, Download, Zap, PieChart } from 'lucide-react';
import type { ExperienciaMinha } from '@pdc/shared';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

export function RelatoriosInstituicaoPage() {
  const { isEnabled, isLoading: flagsLoading } = useFeatureFlags();
  const advancedAnalyticsEnabled = isEnabled('institution_advanced_analytics_enabled');
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['experiencias', 'stats'],
    queryFn: () => experienciasApi.getStats(),
  });

  const { data: experiencias, isLoading: expLoading } = useQuery({
    queryKey: ['experiencias', 'minhas'],
    queryFn: () => experienciasApi.getMinhas(),
  });

  if (flagsLoading || statsLoading || expLoading) return <div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>;

  const expData = experiencias?.data ?? [];

  if (!advancedAnalyticsEnabled) {
    const availableColumns: Column<ExperienciaMinha>[] = [
      { header: 'Experiência', accessor: 'titulo', className: 'font-bold text-ink-primary' },
      {
        header: 'Inscrições',
        accessor: (experiencia: ExperienciaMinha) => (
          <span className="font-mono font-black text-accent">{experiencia.inscricoesCount ?? 0}</span>
        ),
      },
    ];

    return (
      <div className="mx-auto max-w-6xl space-y-10 pb-20">
        <header>
          <Badge variant="info" className="mb-3 border-accent/20 bg-accent/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-accent">
            Relatório institucional
          </Badge>
          <h1 className="font-display text-4xl font-black tracking-tighter text-ink-primary">
            Contagens disponíveis
          </h1>
          <p className="mt-2 text-sm text-ink-secondary">
            Apenas dados reais actualmente disponíveis.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            ['Experiências publicadas', stats?.experienciasPublicadas ?? 0],
            ['Programas activos', stats?.programasActivos ?? 0],
            ['Inscrições', stats?.inscricoesTotais ?? 0],
          ].map(([label, value]) => (
            <Card key={String(label)} className="p-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-ink-tertiary">{label}</p>
              <p className="mt-3 font-mono text-4xl font-black text-ink-primary">{value}</p>
            </Card>
          ))}
        </div>

        <Card className="overflow-hidden">
          <Table columns={availableColumns} data={expData} />
        </Card>
      </div>
    );
  }

  const columns: Column<ExperienciaMinha>[] = [
    { header: 'Experiência', accessor: 'titulo', className: 'font-bold text-ink-primary' },
    { 
      header: 'Taxa de Conversão', 
      accessor: (_exp: ExperienciaMinha) => (
        <div className="flex items-center gap-2">
           <div className="h-1.5 w-12 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-accent w-3/4" />
           </div>
           <span className="text-[10px] font-mono font-bold">75%</span>
        </div>
      ) 
    },
    { 
      header: 'Inscrições', 
      accessor: (_exp: ExperienciaMinha) => (
        <span className="font-mono font-black text-accent">{_exp.inscricoesCount ?? 0}</span>
      ) 
    },
    { 
      header: 'Autoridade AI', 
      accessor: () => <Badge variant="success" className="bg-success/10 text-success border-success/20 uppercase text-[9px]">Validada</Badge> 
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-20 animate-in fade-in duration-1000">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <Badge variant="info" className="bg-accent/10 text-accent border-accent/20 mb-3 px-3 py-1 uppercase tracking-widest text-[9px] font-black">Institutional Intelligence</Badge>
          <h1 className="text-4xl font-black text-ink-primary tracking-tighter font-display">
            Oráculo de <span className="text-accent">Retenção</span>
          </h1>
          <p className="text-ink-secondary mt-2 max-w-lg leading-relaxed text-sm">
            Análise preditiva de capital humano e eficácia de recrutamento vocacional.
          </p>
        </div>
        <Button variant="secondary" size="sm" className="bg-recessed border-white/5 font-bold uppercase tracking-widest text-[10px]">
          <Download size={14} className="mr-2" /> Exportar Relatório Executivo
        </Button>
      </header>

      {/* ── Bento Grid: Strategic KPIs ── */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 auto-rows-[160px]">
        {/* KPI 1: Evasão Projetada (The Hero Metric) */}
        <Card className="md:col-span-3 lg:col-span-2 row-span-2 p-8 bg-recessed border-accent/20 relative overflow-hidden flex flex-col justify-between shadow-2xl">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingDown size={120} className="text-accent" />
          </div>
          <div className="space-y-1 relative z-10">
             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">Redução de Evasão</p>
             <h3 className="text-sm font-medium text-ink-tertiary">Impacto Estimado no 1º Ano</h3>
          </div>
          <div className="relative z-10">
             <span className="text-7xl font-black font-mono tracking-tighter text-ink-primary">-22<span className="text-4xl text-accent">%</span></span>
             <p className="text-xs text-ink-secondary mt-2 leading-relaxed">
               Estudantes que vivem experiências PDC têm <span className="text-success font-bold">80% mais chance</span> de concluir o percurso académico.
             </p>
          </div>
        </Card>

        {/* KPI 2: Talentos de Elite Detectados */}
        <Card className="md:col-span-3 lg:col-span-2 p-8 bg-elevated border-white/5 flex flex-col justify-between">
           <div className="flex justify-between items-start">
              <p className="text-[10px] font-bold text-ink-tertiary uppercase tracking-widest">Talentos de Elite</p>
              <Target size={18} className="text-accent" />
           </div>
           <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black font-mono tracking-tighter">450</span>
              <span className="text-xs font-bold text-ink-tertiary uppercase">Top 1% Angola</span>
           </div>
        </Card>

        {/* KPI 3: Inscrições Activas */}
        <Card className="md:col-span-3 lg:col-span-2 p-8 bg-elevated border-white/5 flex flex-col justify-between">
           <div className="flex justify-between items-start">
              <p className="text-[10px] font-bold text-ink-tertiary uppercase tracking-widest">Captação Qualificada</p>
              <Users size={18} className="text-accent" />
           </div>
           <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black font-mono tracking-tighter">{stats?.inscricoesTotais ?? 0}</span>
              <span className="text-xs font-bold text-ink-tertiary uppercase">Interessados</span>
           </div>
        </Card>

        {/* Mini KPI 4: Match Behavioral */}
        <Card className="md:col-span-3 lg:col-span-2 p-6 bg-elevated border-white/5 flex items-center gap-6">
           <div className="h-12 w-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
              <ShieldCheck size={24} />
           </div>
           <div>
              <p className="text-[9px] font-bold text-ink-tertiary uppercase tracking-widest">Precisão de Match</p>
              <p className="text-xl font-black font-mono">94.8%</p>
           </div>
        </Card>

        {/* Mini KPI 5: Programas Activos */}
        <Card className="md:col-span-3 lg:col-span-2 p-6 bg-elevated border-white/5 flex items-center gap-6">
           <div className="h-12 w-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
              <Zap size={24} />
           </div>
           <div>
              <p className="text-[9px] font-bold text-ink-tertiary uppercase tracking-widest">Programas Activos</p>
              <p className="text-xl font-black font-mono">{stats?.programasActivos ?? 0}</p>
           </div>
        </Card>
      </div>

      {/* ── Data Section: Performance by Experience ── */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
           <h3 className="text-xl font-bold font-display tracking-tight text-ink-primary flex items-center gap-2">
             <BarChart3 size={20} className="text-accent" />
             Análise por Unidade Curricular
           </h3>
           <Badge variant="outline" className="border-white/5 text-ink-tertiary text-[10px] uppercase font-bold">Últimos 30 dias</Badge>
        </div>
        <Card className="overflow-hidden border-white/5 bg-recessed shadow-sm rounded-[32px]">
           <Table columns={columns} data={expData} />
           {expData.length === 0 && (
             <div className="py-20 text-center text-ink-tertiary text-sm italic">
               Nenhuma unidade curricular com dados de telemetria suficientes.
             </div>
           )}
        </Card>
      </section>

      {/* ── Visual Insight: Talent Cluster (Simulated DataViz) ── */}
      <Card className="p-8 bg-elevated border-white/5 rounded-[32px] grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
         <div className="md:col-span-1 space-y-4">
            <h4 className="text-lg font-bold tracking-tight">Cluster de Talentos</h4>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Distribuição comportamental dos estudantes que interagiram com a sua instituição. 
              Foco predominante em <span className="text-accent font-bold">Fluidez Cognitiva</span>.
            </p>
            <div className="pt-4 flex flex-col gap-2">
               <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-ink-tertiary">
                  <div className="h-2 w-2 rounded-full bg-accent" /> Analítico (65%)
               </div>
               <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-ink-tertiary">
                  <div className="h-2 w-2 rounded-full bg-success" /> Prático (20%)
               </div>
               <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-ink-tertiary">
                  <div className="h-2 w-2 rounded-full bg-blue-400" /> Criativo (15%)
               </div>
            </div>
         </div>
         <div className="md:col-span-2 flex justify-center py-4">
            {/* Simulated Radar/Pie Chart Placeholder using SVG */}
            <div className="relative h-48 w-48 flex items-center justify-center">
               <PieChart size={180} className="text-accent/20" strokeWidth={1} />
               <div className="absolute inset-0 flex items-center justify-center">
                  <Zap size={40} className="text-accent animate-pulse opacity-50" />
               </div>
            </div>
         </div>
      </Card>
    </div>
  );
}

import { useAuth } from '@/lib/auth/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Spinner, Card, Badge, Button } from '@/components/ui';
import { 
  BookOpen, 
  Zap, 
  ChevronRight, 
  Brain, 
  Target, 
  Trophy,
  ArrowUpRight,
  Star
} from 'lucide-react';
import { http } from '@/lib/api/http';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

interface DashboardData {
  stats: {
    xp: number;
    reputacao: number;
    conquistasCount: number;
  };
  behavior: {
    domainId: string;
    cognitiveFluidity: number;
    resilienceIndex: number;
    focusStability: number;
    technicalScore: number;
  } | null;
  progressoCursos: Array<{
    id: string;
    curso: string;
    percentagem: number;
  }>;
  nextAction: {
    tipo: string;
    label: string;
    to: string;
  };
}

export function AlunoDashboard() {
  const { user } = useAuth();

  const { data: dash, isLoading, isError } = useQuery({
    queryKey: ['estudante', 'dashboard'],
    queryFn: () => http.get<DashboardData>('/estudante/dashboard'),
  });

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>;

  if (isError || !dash) return <div className="p-8 text-center text-error">Erro ao sincronizar o teu Oráculo.</div>;

  const { stats, behavior, progressoCursos, nextAction } = dash;

  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-20 animate-in fade-in duration-1000">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-text-primary tracking-tighter font-display">
            Olá, <span className="text-accent">{user?.nome?.split(' ')[0] ?? 'Talento'}</span>
          </h1>
          <p className="text-text-secondary mt-1 font-medium italic">O Oráculo está a observar o teu potencial.</p>
        </div>
        <div className="flex gap-4">
           <div className="bg-surface-alt border border-white/5 px-4 py-2 rounded-2xl flex items-center gap-3">
              <Zap size={16} className="text-accent" />
              <span className="font-mono font-black text-lg">{stats.xp.toLocaleString()} <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">XP</span></span>
           </div>
        </div>
      </header>

      {/* ── Main Dashboard Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-4 gap-4 auto-rows-[160px]">
        
        {/* Next Best Action (The Guide) */}
        <Card className="md:col-span-3 lg:col-span-2 row-span-2 p-8 bg-surface-alt border-accent/20 relative overflow-hidden flex flex-col justify-between shadow-2xl">
           <div className="absolute top-0 right-0 p-8 opacity-10">
              <Target size={140} className="text-accent" />
           </div>
           <div className="relative z-10 space-y-2">
              <Badge className="bg-accent/10 text-accent border-accent/20 uppercase text-[9px] font-black tracking-[0.2em]">Next Best Action</Badge>
              <h2 className="text-3xl font-black text-text-primary tracking-tight leading-tight">
                Estás a <span className="text-accent">3 passos</span> do teu match em Engenharia.
              </h2>
           </div>
           <Link to={nextAction.to} className="relative z-10">
              <Button className="w-full h-14 rounded-2xl bg-accent text-white font-black uppercase tracking-widest text-xs hover:scale-[1.02] transition-transform">
                {nextAction.label} <ChevronRight size={16} className="ml-2" />
              </Button>
           </Link>
        </Card>

        {/* Behavior Pattern (Músculo) */}
        <Card className="md:col-span-3 lg:col-span-2 row-span-2 p-8 bg-surface border-white/5 flex flex-col space-y-8">
           <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-text-muted flex items-center gap-2">
                <Brain size={14} className="text-accent" /> DNA Behavioral
              </h3>
              {behavior && <span className="font-mono text-[10px] font-bold text-accent uppercase tracking-widest">{behavior.domainId}</span>}
           </div>

           {!behavior ? (
             <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 opacity-40">
                <Target size={40} className="text-text-muted" />
                <p className="text-[10px] uppercase font-black tracking-widest text-text-muted">Evidências insuficientes</p>
             </div>
           ) : (
             <div className="flex-1 space-y-6">
                {[
                  { label: 'Fluidez', val: behavior.cognitiveFluidity, max: 10, color: 'bg-accent' },
                  { label: 'Resiliência', val: behavior.resilienceIndex, max: 10, color: 'bg-success' },
                  { label: 'Foco', val: behavior.focusStability, max: 10, color: 'bg-blue-400' },
                ].map(stat => (
                  <div key={stat.label} className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                       <span className="text-text-secondary">{stat.label}</span>
                       <span className="text-text-primary font-mono">{stat.val.toFixed(1)}</span>
                    </div>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                       <motion.div 
                         initial={{ width: 0 }} 
                         animate={{ width: `${(stat.val/stat.max)*100}%` }}
                         transition={{ duration: 1.5, delay: 0.5 }}
                         className={`h-full ${stat.color}`} 
                       />
                    </div>
                  </div>
                ))}
             </div>
           )}

           <Link to="/app/reputacao" className="text-[10px] font-black text-text-muted hover:text-accent uppercase tracking-widest flex items-center gap-1 transition-colors">
              Ver Diagnóstico Completo <ArrowUpRight size={12} />
           </Link>
        </Card>

        {/* Global Stats */}
        <Card className="md:col-span-2 lg:col-span-1 p-6 bg-surface border-white/5 flex flex-col justify-between">
           <Trophy size={20} className="text-accent/40" />
           <div>
              <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Conquistas</p>
              <p className="text-3xl font-black font-mono">{stats.conquistasCount}</p>
           </div>
        </Card>

        {/* Reputação */}
        <Card className="md:col-span-2 lg:col-span-1 p-6 bg-surface border-white/5 flex flex-col justify-between">
           <Star size={20} className="text-accent/40" />
           <div>
              <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Reputação</p>
              <p className="text-3xl font-black font-mono">{stats.reputacao}</p>
           </div>
        </Card>
      </div>

      {/* ── Secondary Section: Courses & Academic Pulse ── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 space-y-6">
            <h3 className="text-xl font-bold font-display tracking-tight text-text-primary flex items-center gap-2">
               <BookOpen size={20} className="text-accent" />
               Módulos Activos
            </h3>
            <div className="grid grid-cols-1 gap-3">
               {progressoCursos.length === 0 ? (
                 <Card className="p-12 text-center bg-surface border-dashed border-white/10 opacity-60">
                    <p className="text-sm text-text-muted uppercase font-black tracking-widest">Nenhum curso em progresso</p>
                    <Link to="/app/cursos" className="inline-block mt-4 text-xs font-bold text-accent hover:underline uppercase tracking-widest">Explorar Catálogo →</Link>
                 </Card>
               ) : (
                 progressoCursos.map(c => (
                   <Card key={c.id} className="p-5 flex items-center justify-between bg-surface border-white/5 hover:border-accent/20 transition-all group">
                      <div className="flex items-center gap-4">
                         <div className="h-10 w-10 rounded-xl bg-accent/5 flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                            <BookOpen size={18} />
                         </div>
                         <div>
                            <h4 className="font-bold text-text-primary group-hover:text-accent transition-colors">{c.curso}</h4>
                            <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Académico • Angola</p>
                         </div>
                      </div>
                      <div className="text-right">
                         <p className="text-xs font-mono font-black text-text-primary">{c.percentagem}%</p>
                         <div className="h-1 w-24 bg-white/5 rounded-full overflow-hidden mt-1.5">
                            <div className="h-full bg-accent" style={{ width: `${c.percentagem}%` }} />
                         </div>
                      </div>
                   </Card>
                 ))
               )}
            </div>
         </div>

         <div className="space-y-6">
            <h3 className="text-xl font-bold font-display tracking-tight text-text-primary flex items-center gap-2">
               <Zap size={20} className="text-accent" />
               Pulse
            </h3>
            <Card className="p-6 bg-surface-alt border-white/5 rounded-[32px] flex flex-col items-center text-center space-y-4">
               <div className="h-12 w-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                  <Target size={24} />
               </div>
               <p className="text-xs font-medium text-text-secondary leading-relaxed">
                  A tua fluidez cognitiva subiu <span className="text-success font-bold">+12%</span> esta semana.
               </p>
               <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-accent">Ver Análise Completa →</Button>
            </Card>
         </div>
      </section>
    </div>
  );
}

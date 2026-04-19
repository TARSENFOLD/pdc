import { useAuth } from '@/lib/auth/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Spinner, Card, Button } from '@/components/ui';
import { 
  BookOpen, 
  Zap, 
  ChevronRight, 
  Brain, 
  Target, 
  Trophy,
  ArrowUpRight,
  Star,
  Activity,
  UserCheck
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

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-background"><Spinner size="lg" /></div>;

  if (isError || !dash) return <div className="p-8 text-center text-error bg-background min-h-screen flex flex-col items-center justify-center gap-4">
    <p className="font-bold">Erro ao sincronizar o teu Oráculo.</p>
    <Button onClick={() => window.location.reload()} variant="secondary">Tentar novamente</Button>
  </div>;

  const { stats, behavior, progressoCursos, nextAction } = dash;

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="mx-auto max-w-7xl space-y-10 pb-20 px-4 sm:px-6 lg:px-8"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-bold uppercase tracking-widest mb-4">
             <Activity size={12} /> Sistema Operacional
          </div>
          <h1 className="text-4xl font-black text-text-primary tracking-tighter sm:text-5xl font-display">
            Central de <span className="text-accent">Comando.</span>
          </h1>
          <p className="text-text-secondary mt-2 text-lg">Olá, {user?.nome?.split(' ')[0] ?? 'Talento'}. O teu percurso está a ser processado.</p>
        </div>
        <div className="flex gap-3">
           <div className="glass-surface px-6 py-3 rounded-2xl flex items-center gap-4 shadow-xl border-white/5">
              <div className="h-10 w-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
                <Zap size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-text-muted font-black uppercase tracking-widest">Nível Global</span>
                <span className="font-mono font-black text-2xl tracking-tighter">{stats.xp.toLocaleString()} <span className="text-sm">XP</span></span>
              </div>
           </div>
        </div>
      </header>

      {/* ── Main Bento Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[180px]">
        
        {/* Match Vocacional (The Hero Card) */}
        <motion.div variants={item} className="md:col-span-8 row-span-2">
          <Card className="h-full p-10 bg-surface-raised/40 backdrop-blur-2xl relative overflow-hidden flex flex-col justify-between border-white/5 shadow-2xl group rounded-[32px]">
             {/* Background Decoration (Sovereign Glow) */}
             <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-accent/20 blur-[100px] group-hover:bg-accent/30 transition-all duration-1000" />
             <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                <Target size={280} className="text-accent" />
             </div>

             <div className="relative z-10 space-y-6 max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-accent text-background text-[9px] font-black tracking-[0.2em] uppercase">
                   Directiva Mestre
                </div>
                <h2 className="text-4xl font-black text-text-primary tracking-tighter leading-[1.05] sm:text-6xl font-display">
                  Match em <span className="text-accent italic">Engenharia Civil</span> com 87% de autoridade.
                </h2>
                <p className="text-text-secondary text-lg font-medium leading-relaxed max-w-md">
                  Os teus padrões de <span className="text-text-primary">Fluidez Cognitiva</span> indicam aptidão superior para cálculo estrutural e raciocínio espacial.
                </p>
             </div>
             
             <div className="relative z-10 mt-10 flex flex-col sm:flex-row items-center gap-4">
               <Link to={nextAction.to} className="w-full sm:w-auto">
                  <Button className="w-full h-14 rounded-2xl bg-text-primary text-background font-black uppercase tracking-widest text-[11px] hover:bg-accent hover:text-white shadow-xl transition-all px-10">
                    {nextAction.label} <ChevronRight size={16} className="ml-2" />
                  </Button>
               </Link>
               <Link to="/app/perfil-vocacional" className="w-full sm:w-auto">
                  <Button variant="secondary" className="w-full h-14 rounded-2xl border-white/10 bg-white/5 backdrop-blur-md text-text-primary font-black uppercase tracking-widest text-[11px] px-10 hover:bg-white/10 transition-all">
                    Relatório Detalhado <ArrowUpRight size={16} className="ml-2" />
                  </Button>
               </Link>
             </div>
          </Card>
        </motion.div>

        {/* Behavior Pattern (Músculo) */}
        <motion.div variants={item} className="md:col-span-4 row-span-2">
          <Card className="h-full p-8 bg-[#0A0A0A] border border-white/5 flex flex-col space-y-8 shadow-2xl rounded-[32px] relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-b from-accent/5 to-transparent pointer-events-none" />
             
             <div className="flex items-center justify-between relative z-10">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted flex items-center gap-2">
                  <Brain size={14} className="text-accent" /> Assinatura DNA
                </h3>
                {behavior && (
                  <div className="px-2 py-1 rounded-md bg-accent/10 border border-accent/20 text-[9px] font-mono font-bold text-accent uppercase tracking-wider">
                    {behavior.domainId}
                  </div>
                )}
             </div>

             {!behavior ? (
               <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 opacity-30 relative z-10">
                  <div className="h-20 w-20 rounded-3xl border-2 border-dashed border-text-muted flex items-center justify-center">
                    <Activity size={32} className="text-text-muted" />
                  </div>
                  <p className="text-[10px] uppercase font-black tracking-[0.3em] text-text-muted">A processar heurísticas...</p>
               </div>
             ) : (
               <div className="flex-1 space-y-10 relative z-10">
                  {[
                    { label: 'Fluidez Cognitiva \u03D5', val: behavior.cognitiveFluidity, max: 10, color: 'bg-accent', icon: Activity },
                    { label: 'Resiliência ao Erro R', val: behavior.resilienceIndex, max: 10, color: 'bg-emerald-500', icon: Trophy },
                    { label: 'Estabilidade de Foco', val: behavior.focusStability, max: 10, color: 'bg-blue-600', icon: Target },
                  ].map(stat => (
                    <div key={stat.label} className="space-y-4">
                      <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-widest">
                         <span className="text-text-secondary flex items-center gap-2.5">
                           <stat.icon size={14} className="text-text-muted" /> {stat.label}
                         </span>
                         <span className="text-text-primary font-mono text-base tracking-tighter">{stat.val.toFixed(2)}</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                         <motion.div 
                           initial={{ width: 0 }} 
                           animate={{ width: `${(stat.val/stat.max)*100}%` }}
                           transition={{ duration: 2.5, ease: [0.23, 1, 0.32, 1], delay: 0.8 }}
                           className={`h-full ${stat.color} shadow-[0_0_15px_rgba(255,255,255,0.1)]`} 
                         />
                      </div>
                    </div>
                  ))}
               </div>
             )}

             <Link to="/app/perfil-vocacional" className="group relative z-10 text-[10px] font-black text-text-muted hover:text-accent uppercase tracking-[0.2em] flex items-center justify-between border-t border-white/5 pt-6 transition-colors">
                Análise Preditiva <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
             </Link>
          </Card>
        </motion.div>

        {/* Global Stats: Conquistas */}
        <motion.div variants={item} className="md:col-span-3">
          <Link to="/app/conquistas" className="block h-full">
            <Card className="h-full p-6 bg-surface-raised/40 backdrop-blur-md border-white/5 flex items-center gap-6 hover:bg-white/5 transition-all group shadow-lg">
               <div className="h-12 w-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent group-hover:scale-110 transition-transform border border-accent/20">
                  <Trophy size={24} />
               </div>
               <div>
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Conquistas</p>
                  <p className="text-3xl font-black font-mono tracking-tighter text-text-primary">{stats.conquistasCount}</p>
               </div>
            </Card>
          </Link>
        </motion.div>

        {/* Global Stats: Reputação */}
        <motion.div variants={item} className="md:col-span-3">
          <Link to="/app/reputacao" className="block h-full">
            <Card className="h-full p-6 bg-surface-raised/40 backdrop-blur-md border-white/5 flex items-center gap-6 hover:bg-white/5 transition-all group shadow-lg">
               <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform border border-blue-500/20">
                  <Star size={24} />
               </div>
               <div>
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Reputação</p>
                  <p className="text-3xl font-black font-mono tracking-tighter text-text-primary">{stats.reputacao}</p>
               </div>
            </Card>
          </Link>
        </motion.div>

        {/* Global Stats: Vínculos */}
        <motion.div variants={item} className="md:col-span-3">
          <Link to="/app/vinculos" className="block h-full">
            <Card className="h-full p-6 bg-surface-raised/40 backdrop-blur-md border-white/5 flex items-center gap-6 hover:bg-white/5 transition-all group shadow-lg">
               <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform border border-emerald-500/20">
                  <UserCheck size={24} />
               </div>
               <div>
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Vínculos</p>
                  <p className="text-3xl font-black font-mono tracking-tighter text-text-primary">14</p>
               </div>
            </Card>
          </Link>
        </motion.div>

        {/* Global Stats: Pulse Semanal */}
        <motion.div variants={item} className="md:col-span-3">
          <Card className="h-full p-6 bg-accent/5 border border-accent/20 backdrop-blur-md flex flex-col justify-between shadow-lg">
             <div className="flex justify-between items-center">
                <span className="text-[9px] font-black text-accent uppercase tracking-widest">Pulse Semanal</span>
                <span className="text-[10px] font-bold text-success">+12%</span>
             </div>
             <p className="text-sm font-black text-text-primary leading-tight font-display tracking-tight">Estás com uma fluidez cognitiva recorde.</p>
          </Card>
        </motion.div>
      </div>

      {/* ── Secondary Section: Courses ── */}
      <motion.section variants={item} className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black font-display tracking-tight text-text-primary flex items-center gap-3">
               <BookOpen size={24} className="text-accent" />
               Módulos de Formação
            </h3>
            <Link to="/app/cursos" className="text-xs font-black text-accent hover:underline uppercase tracking-widest">Ver Catálogo →</Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {progressoCursos.length === 0 ? (
               <Card className="md:col-span-3 p-16 text-center bg-surface border-dashed border-white/10 opacity-60 rounded-3xl">
                  <p className="text-sm text-text-muted uppercase font-black tracking-[0.3em]">Nenhum curso em progresso</p>
                  <Link to="/app/cursos" className="inline-block mt-6 text-xs font-bold text-accent hover:underline uppercase tracking-widest">Explorar Oportunidades →</Link>
               </Card>
             ) : (
               progressoCursos.map(c => (
                 <Card key={c.id} className="p-6 bg-surface border-white/5 hover:border-white/10 transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-accent/10 transition-colors" />
                    <div className="flex items-center gap-4 mb-6">
                       <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center text-accent group-hover:scale-110 transition-transform border border-white/5">
                          <BookOpen size={20} />
                       </div>
                       <div className="min-w-0">
                          <h4 className="font-bold text-text-primary truncate">{c.curso}</h4>
                          <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Certificação PDC</p>
                       </div>
                    </div>
                    <div className="space-y-2">
                       <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                          <span className="text-text-muted">Progresso</span>
                          <span className="text-text-primary font-mono">{c.percentagem}%</span>
                       </div>
                       <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${c.percentagem}%` }}
                            className="h-full bg-accent" 
                          />
                       </div>
                    </div>
                 </Card>
               ))
             )}
          </div>
      </motion.section>
    </motion.div>
  );
}

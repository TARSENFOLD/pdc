import { useAuth } from '@/lib/auth/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { 
  Spinner, 
  Card, 
  Button, 
  BentoGrid, 
  BentoTile, 
  GlassCard, 
  AsymmetricButton, 
  AspirationalEmpty 
} from '@/components/ui';
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

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-canvas"><Spinner size="lg" /></div>;

  if (isError || !dash) return <div className="p-8 text-center text-red-500 bg-canvas min-h-screen flex flex-col items-center justify-center gap-4">
    <p className="font-bold font-display text-2xl">Erro ao sincronizar o teu Oráculo.</p>
    <Button onClick={() => window.location.reload()} variant="secondary">Tentar novamente</Button>
  </div>;

  const { stats, behavior, progressoCursos, match, proximaAcao, insightsTina } = dash;
...
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-bold uppercase tracking-widest mb-4">
             <Activity size={12} /> Sistema Operacional Ativo
          </div>
          <h1 className="text-4xl font-black text-ink-primary tracking-tighter sm:text-5xl font-display">
            Painel de <span className="text-accent">Decisão.</span>
          </h1>
          <p className="text-ink-secondary mt-2 text-lg">Olá, {user?.nome?.split(' ')[0] ?? 'Talento'}. O teu percurso está a ser processado.</p>
        </div>
        
        <div className="flex gap-3">
           <GlassCard halo className="px-6 py-3 rounded-2xl flex items-center gap-4 shadow-xl border-ink-tertiary/10">
              <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                <Zap size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-ink-tertiary font-black uppercase tracking-widest">Nível Global</span>
                <span className="font-mono font-black text-2xl tracking-tighter text-ink-primary">{stats.xp.toLocaleString()} <span className="text-sm">XP</span></span>
              </div>
           </GlassCard>
        </div>
      </header>

      {/* ── Main Bento Grid ── */}
      <BentoGrid>
        
        {/* Match Vocacional (The Hero Tile) */}
        <BentoTile size="2x2" asymmetric className="p-10 relative overflow-hidden group border-none shadow-2xl">
           <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-accent/10 blur-[100px] group-hover:bg-accent/20 transition-all duration-1000" />
           <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
              <Target size={280} className="text-accent" />
           </div>

           <div className="relative z-10 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-accent text-ink-on-accent text-[9px] font-black tracking-[0.2em] uppercase">
                 {match.directive}
              </div>
              <h2 className="text-4xl font-black text-ink-primary tracking-tighter leading-[1.05] sm:text-6xl font-display">
                Match em <span className="text-accent italic">{match.area}</span> com {match.score}% de autoridade.
              </h2>
              <p className="text-ink-secondary text-lg font-medium leading-relaxed max-w-md">
                {match.insight}
              </p>
           </div>
           
           <div className="relative z-10 mt-10 flex flex-col sm:flex-row items-center gap-4">
             <Link to={proximaAcao.to} className="w-full sm:w-auto">
                <AsymmetricButton className="w-full h-14 bg-ink-primary text-canvas font-black uppercase tracking-widest text-[11px] hover:bg-accent hover:text-ink-on-accent shadow-xl transition-all px-10">
                  {proximaAcao.label} <ChevronRight size={16} className="ml-2" />
                </AsymmetricButton>
             </Link>
             <Link to="/app/perfil-vocacional" className="w-full sm:w-auto">
                <Button variant="secondary" className="w-full h-14 rounded-xl border-ink-tertiary/10 bg-recessed text-ink-primary font-black uppercase tracking-widest text-[11px] px-10 hover:bg-canvas/50 transition-all">
                  Relatório Detalhado <ArrowUpRight size={16} className="ml-2" />
                </Button>
             </Link>
           </div>
        </BentoTile>

        {/* Behavior Pattern (Assinatura DNA) */}
        <BentoTile size="2x1" className="p-8 relative overflow-hidden bg-recessed/30">
             <div className="absolute inset-0 bg-gradient-to-b from-accent/5 to-transparent pointer-events-none" />
             <div className="flex items-center justify-between relative z-10">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-ink-tertiary flex items-center gap-2">
                  <Brain size={14} className="text-accent" /> Assinatura DNA
                </h3>
                {behavior && (
                  <div className="px-2 py-1 rounded-md bg-accent/10 border border-accent/20 text-[9px] font-mono font-bold text-accent uppercase tracking-wider">
                    {behavior.domainId}
                  </div>
                )}
             </div>

             {!behavior ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-2 opacity-30">
                  <Activity size={24} className="text-ink-tertiary" />
                  <p className="text-[9px] uppercase font-black tracking-widest">Calculando Heurísticas</p>
                </div>
             ) : (
               <div className="mt-6 grid grid-cols-3 gap-6 relative z-10">
                  {[
                    { label: 'Fluidez \u03D5', val: behavior.fluidez },
                    { label: 'Resiliência R', val: behavior.resiliencia },
                    { label: 'Foco', val: behavior.foco },
                  ].map(stat => (
                    <div key={stat.label} className="text-center space-y-1">
                      <p className="text-[9px] font-black text-ink-tertiary uppercase tracking-tighter">{stat.label}</p>
                      <p className="text-2xl font-black font-mono tracking-tighter text-ink-primary">{stat.val.toFixed(2)}</p>
                    </div>
                  ))}
               </div>
             )}
             
             <Link to="/app/perfil-vocacional" className="mt-auto group relative z-10 text-[9px] font-black text-ink-tertiary hover:text-accent uppercase tracking-[0.2em] flex items-center justify-between border-t border-ink-tertiary/10 pt-4 transition-colors">
                Análise Preditiva <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
             </Link>
        </BentoTile>

        {/* Global Stats: Conquistas */}
        <BentoTile size="1x1">
          <Link to="/app/conquistas" className="flex flex-col h-full justify-between group">
             <div className="h-10 w-10 rounded-xl bg-accent/5 flex items-center justify-center text-accent border border-accent/10 group-hover:scale-110 transition-transform">
                <Trophy size={20} />
             </div>
             <div>
                <p className="text-[10px] font-black text-ink-tertiary uppercase tracking-widest">Conquistas</p>
                <p className="text-3xl font-black font-mono tracking-tighter text-ink-primary">{stats.conquistasCount}</p>
             </div>
          </Link>
        </BentoTile>

        {/* Global Stats: Reputação */}
        <BentoTile size="1x1">
          <Link to="/app/reputacao" className="flex flex-col h-full justify-between group">
             <div className="h-10 w-10 rounded-xl bg-cobalt/5 flex items-center justify-center text-cobalt border border-cobalt/10 group-hover:scale-110 transition-transform">
                <Star size={20} />
             </div>
             <div>
                <p className="text-[10px] font-black text-ink-tertiary uppercase tracking-widest">Reputação</p>
                <p className="text-3xl font-black font-mono tracking-tighter text-ink-primary">{stats.reputacao}</p>
             </div>
          </Link>
        </BentoTile>

        {/* Global Stats: Vínculos */}
        <BentoTile size="1x1">
          <Link to="/app/vinculos" className="flex flex-col h-full justify-between group">
             <div className="h-10 w-10 rounded-xl bg-green-500/5 flex items-center justify-center text-green-600 border border-green-500/10 group-hover:scale-110 transition-transform">
                <UserCheck size={20} />
             </div>
             <div>
                <p className="text-[10px] font-black text-ink-tertiary uppercase tracking-widest">Vínculos</p>
                <p className="text-3xl font-black font-mono tracking-tighter text-ink-primary">{stats.vinkulosCount}</p>
             </div>
          </Link>
        </BentoTile>

        {/* Pulse Semanal (Tina Insight Mini) */}
        <BentoTile size="1x1" className="bg-accent/5 border-accent/20">
             <div className="flex justify-between items-start">
                <span className="text-[9px] font-black text-accent uppercase tracking-widest">Pulse</span>
                <span className="text-[10px] font-bold text-green-600">+{stats.pulseVariacao}%</span>
             </div>
             <p className="mt-2 text-xs font-black text-ink-primary leading-tight font-display tracking-tight">Estás com uma fluidez cognitiva recorde.</p>
        </BentoTile>

      </BentoGrid>

      {/* ── Tina Insights Section ── */}
      <motion.section variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {insightsTina.map((insight, idx) => (
          <GlassCard key={idx} halo={idx === 0} className="border-accent/10">
            <div className="flex gap-4 items-start">
               <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
                  <Brain size={16} />
               </div>
               <p className="text-sm font-medium italic text-ink-primary leading-relaxed">
                 "{insight}"
               </p>
            </div>
          </GlassCard>
        ))}
      </motion.section>

      {/* ── Secondary Section: Courses ── */}
      <motion.section variants={item} className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black font-display tracking-tight text-ink-primary flex items-center gap-3">
               <BookOpen size={24} className="text-accent" />
               Módulos de Formação
            </h3>
            <Link to="/app/cursos" className="text-xs font-black text-accent hover:underline uppercase tracking-widest">Ver Catálogo →</Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {progressoCursos.length === 0 ? (
               <AspirationalEmpty 
                 icon={BookOpen}
                 title="O teu percurso começa aqui"
                 description="Inscreve-te num curso para começares a validar as tuas aptidões técnicas e construíres o teu Perfil Vocacional."
                 className="md:col-span-3"
               >
                 <Link to="/app/cursos">
                    <Button variant="secondary" className="px-8 font-black uppercase tracking-widest text-[10px]">
                      Explorar Oportunidades
                    </Button>
                 </Link>
               </AspirationalEmpty>
             ) : (
               progressoCursos.map(c => (
                 <Card key={c.id} className="p-6 bg-elevated border-ink-tertiary/10 hover:border-accent/20 transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-accent/10 transition-colors" />
                    <div className="flex items-center gap-4 mb-6">
                       <div className="h-12 w-12 rounded-2xl bg-recessed flex items-center justify-center text-accent group-hover:scale-110 transition-transform border border-ink-tertiary/10">
                          <BookOpen size={20} />
                       </div>
                       <div className="min-w-0">
                          <h4 className="font-bold text-ink-primary truncate">{c.titulo}</h4>
                          <p className="text-[10px] text-ink-tertiary font-bold uppercase tracking-widest">Certificação PDC</p>
                       </div>
                    </div>
                    <div className="space-y-2">
                       <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                          <span className="text-ink-tertiary">Progresso</span>
                          <span className="text-ink-primary font-mono">{c.progresso}%</span>
                       </div>
                       <div className="h-1.5 w-full bg-recessed rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${c.progresso}%` }}
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
    </motion.div>
  );
}

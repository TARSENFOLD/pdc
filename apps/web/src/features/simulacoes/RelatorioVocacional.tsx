import { useEffect, useState } from 'react';
import { http } from '../../lib/api/http';
import { Card, Spinner, Button } from '../../components/ui';
import { Link } from 'react-router-dom';
import { 
  Microscope, 
  Activity, 
  GraduationCap, 
  Zap, 
  ArrowLeft, 
  ShieldCheck, 
  Trophy,
  Brain,
  Target,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { ReputacaoBreakdown, ReputacaoTier } from '@pdc/shared';

interface PatternData {
  domainId: string;
  cognitiveFluidity: number;
  resilienceIndex: number;
  focusStability: number;
  technicalScore: number;
  tinaSummary: {
    fluidity: string;
    resilience: string;
    focus: string;
    verdict?: string;
    lastHeuristicUpdate?: string;
  };
}

interface RelatorioElite {
  patterns: PatternData[];
  scoreGlobal: number;
  recomendacoes: Array<{
    cursoId: string;
    titulo: string;
    matchPercentagem: number;
    motivo: string;
  }>;
}

// ─── Sub-component: Sovereign Gauge ───────────────────────────────────────

const CircularCerteza = ({ value, tier, label }: { value: number; tier?: ReputacaoTier | null | undefined; label: string }) => {
  const radius = 85;
  const circumference = 2 * Math.PI * radius;
  const progress = (value / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center group">
      <div className="absolute inset-0 bg-accent/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
      <svg className="w-56 h-56 transform -rotate-90 relative z-10">
        <circle
          cx="112" cy="112" r={radius}
          fill="transparent"
          stroke="rgba(255,255,255,0.03)"
          strokeWidth="12"
        />
        <motion.circle
          cx="112" cy="112" r={radius}
          fill="transparent"
          stroke="url(#accent-gradient)"
          strokeWidth="12"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 2.5, ease: [0.23, 1, 0.32, 1] }}
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="accent-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--color-accent)" />
            <stop offset="100%" stopColor="#FF5C00" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center z-20">
        <span className="font-mono text-5xl font-black tracking-tighter text-text-primary">
          {String(value)}<span className="text-accent text-2xl">%</span>
        </span>
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted mt-1">{label}</span>
      </div>
      {tier && (
        <div className="absolute -bottom-2 bg-accent text-white text-[10px] font-black px-4 py-1 rounded-full shadow-xl uppercase tracking-[0.2em] animate-in zoom-in duration-1000 delay-500 z-30">
           {tier}
        </div>
      )}
    </div>
  );
};

export const RelatorioVocacional = () => {
  const [data, setData] = useState<RelatorioElite | null>(null);
  const [reputacao, setReputacao] = useState<ReputacaoBreakdown | null>(null);
  const [reputationDisabled, setReputationDisabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        // R2.T6: Consumo do breakdown canónico (Gated por Flag)
        const repRes = await http.get<ReputacaoBreakdown>('/reputacao/me');
        setReputacao(repRes);
        
        // Placeholder para patterns e recomendações (Approach §1.3)
        // Nesta wave, usamos dados vazios ou placeholders se o endpoint elite não for chamado
        setData({
          patterns: [],
          scoreGlobal: repRes.score,
          recomendacoes: []
        });
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'status' in err && err.status === 404) {
          setReputationDisabled(true);
        }
        console.error('Falha ao sincronizar Oráculo:', err);
      } finally {
        setLoading(false);
      }
    };
    void fetchAll();
  }, []);

  if (loading) return (
    <div className="flex h-screen flex-col items-center justify-center bg-[#050505] gap-6">
      <div className="relative">
        <div className="absolute inset-0 bg-accent/20 blur-3xl animate-pulse" />
        <Spinner size="lg" className="relative z-10" />
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-accent animate-pulse">Sincronizando Oráculo</p>
    </div>
  );

  if (reputationDisabled) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-8 text-center gap-6">
        <div className="h-20 w-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-text-muted mb-4">
          <ShieldCheck size={40} className="opacity-20" />
        </div>
        <h2 className="text-3xl font-black text-text-primary tracking-tighter uppercase font-display">Reputação ainda não disponível</h2>
        <p className="text-text-secondary max-w-md leading-relaxed">
          O motor de reputação soberano está a processar os teus dados de mérito. 
          Continua a realizar simulações para gerares a tua primeira assinatura de autoridade.
        </p>
        <Link to="/app/simulacoes">
          <Button variant="secondary" className="mt-4 px-8 rounded-2xl font-black uppercase tracking-widest text-xs">
            Ir para Simulações
          </Button>
        </Link>
      </div>
    );
  }

  const mainPattern = data?.patterns[0];

  return (
    <div className="min-h-screen bg-[#050505] relative overflow-hidden font-sans selection:bg-accent/30">
      {/* Camada de Alma */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('/images/pattern-afro.svg')] bg-repeat" />
      <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-accent/5 blur-[150px] rounded-full -translate-y-1/2" />

      <div className="mx-auto max-w-7xl space-y-16 pb-32 px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Nav Soberana */}
        <nav className="flex items-center justify-between pt-12">
          <Link to="/app" className="group flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-text-muted hover:text-accent transition-all">
            <div className="h-8 w-8 rounded-full border border-white/5 flex items-center justify-center group-hover:border-accent/30 transition-colors">
              <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> 
            </div>
            Painel de Decisão
          </Link>
          <div className="flex items-center gap-4">
            <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">
              DOC: ANALYTICS_V2_ELITE
            </div>
            <button className="h-10 w-10 rounded-2xl bg-accent text-background flex items-center justify-center hover:scale-105 transition-all shadow-xl shadow-accent/20">
              <Zap size={20} strokeWidth={2.5} />
            </button>
          </div>
        </nav>

        {/* Header imersivo */}
        <header className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-8">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-xl bg-accent/10 border border-accent/20 text-accent text-[11px] font-black uppercase tracking-[0.2em]"
            >
              <ShieldCheck size={16} /> Certificação de Autoridade Cognitiva
            </motion.div>
            
            <h1 className="text-5xl font-black tracking-tighter text-text-primary sm:text-8xl font-display leading-[0.9]">
              Espelho da <br /> <span className="text-accent italic">Aptidão.</span>
            </h1>
            
            <p className="text-text-secondary text-xl font-medium max-w-xl leading-relaxed opacity-80">
              A tua assinatura comportamental foi processada pelo Oráculo. Estes dados são a evidência do teu potencial real.
            </p>
          </div>

          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <CircularCerteza 
              value={reputacao?.score || data?.scoreGlobal || 87} 
              tier={reputacao?.tier} 
              label="Nível de Autoridade" 
            />
          </div>
        </header>

        {/* Bento de Músculo */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Analytics Card */}
          <Card className="lg:col-span-2 p-10 bg-surface-raised/40 backdrop-blur-2xl border-white/5 shadow-2xl relative overflow-hidden rounded-[40px]">
             <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-[80px] -translate-y-1/2 translate-x-1/2" />
             
             <div className="flex items-center justify-between mb-16 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-accent/20 border border-accent/30 flex items-center justify-center text-accent">
                    <Activity size={24} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black font-display tracking-tight text-text-primary">
                      Motor \u03D5 & R
                    </h3>
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Padrões Behaviorais de Alta Precisão</p>
                  </div>
                </div>
                {mainPattern && (
                  <div className="px-3 py-1 rounded-lg bg-black/40 border border-white/10 font-mono text-xs font-bold text-accent">
                    DOMAIN: {mainPattern.domainId.toUpperCase()}
                  </div>
                )}
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                {/* Phi Stat */}
                <div className="space-y-8 p-8 rounded-[32px] bg-black/40 border border-white/5 hover:border-accent/20 transition-colors group">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-2">Fluidez Cognitiva (\u03D5)</p>
                      <h4 className="text-6xl font-mono font-black text-text-primary tracking-tighter group-hover:text-accent transition-colors">
                        {mainPattern?.cognitiveFluidity.toFixed(2)}
                      </h4>
                    </div>
                    <Brain className="text-text-muted/20 group-hover:text-accent/20 transition-colors" size={40} />
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(mainPattern?.cognitiveFluidity ?? 0) * 10}%` }}
                      transition={{ duration: 2, ease: [0.23, 1, 0.32, 1] }}
                      className="h-full bg-accent shadow-[0_0_20px_rgba(210,105,30,0.5)]" 
                    />
                  </div>
                  <p className="text-sm font-medium text-text-secondary leading-relaxed opacity-80">
                    {mainPattern?.tinaSummary.fluidity}
                  </p>
                </div>

                {/* Resilience Stat */}
                <div className="space-y-8 p-8 rounded-[32px] bg-black/40 border border-white/5 hover:border-emerald-500/20 transition-colors group">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-2">Resiliência ao Erro (R)</p>
                      <h4 className="text-6xl font-mono font-black text-text-primary tracking-tighter group-hover:text-emerald-500 transition-colors">
                        {mainPattern?.resilienceIndex.toFixed(2)}
                      </h4>
                    </div>
                    <Target className="text-text-muted/20 group-hover:text-emerald-500/20 transition-colors" size={40} />
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(mainPattern?.resilienceIndex ?? 0) * 10}%` }}
                      transition={{ duration: 2, ease: [0.23, 1, 0.32, 1], delay: 0.2 }}
                      className="h-full bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]" 
                    />
                  </div>
                  <p className="text-sm font-medium text-text-secondary leading-relaxed opacity-80">
                    {mainPattern?.tinaSummary.resilience}
                  </p>
                </div>
             </div>

             {/* Tina's Dynamic Verdict */}
             <AnimatePresence>
               {mainPattern?.tinaSummary.verdict && (
                 <motion.div 
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="mt-10 p-8 rounded-[32px] bg-accent/5 border border-accent/20 relative overflow-hidden group"
                 >
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:rotate-12 transition-transform">
                      <Sparkles size={48} className="text-accent" />
                    </div>
                    <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-accent mb-4 flex items-center gap-2">
                       <Brain size={14} /> Veredito do Oráculo
                    </h5>
                    <p className="text-lg font-black text-text-primary leading-tight font-display tracking-tight">
                      "{mainPattern.tinaSummary.verdict}"
                    </p>
                 </motion.div>
               )}
             </AnimatePresence>
          </Card>

          {/* Siderbar Bento Stats */}
          <div className="space-y-8">
            <Card className="p-8 bg-surface-raised/40 backdrop-blur-xl border-white/5 rounded-[40px] shadow-2xl flex flex-col justify-between h-full">
               <h3 className="text-[11px] font-black text-text-muted uppercase tracking-[0.3em] mb-10 flex items-center gap-2">
                 <Trophy size={14} className="text-accent" /> Matriz de Mérito
               </h3>
               
               <div className="grid grid-cols-2 gap-4 flex-1">
                 {[
                   { label: 'Cursos', val: reputacao?.dimensions.cursosPublicados || 0, icon: GraduationCap },
                   { label: 'Simulações', val: reputacao?.dimensions.simulacoes || 0, icon: Microscope },
                   { label: 'Mérito', val: reputacao?.score || 0, icon: Star },
                   { label: 'Foco', val: mainPattern?.focusStability.toFixed(1) || '0.0', icon: Activity },
                 ].map(dim => (
                   <div key={dim.label} className="p-5 rounded-3xl bg-white/5 border border-white/5 flex flex-col items-center justify-center gap-3 hover:bg-white/10 transition-colors">
                      <dim.icon size={20} className="text-accent" />
                      <div className="text-center">
                        <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">{dim.label}</p>
                        <p className="text-xl font-black font-mono tracking-tighter text-text-primary">{dim.val}</p>
                      </div>
                   </div>
                 ))}
               </div>

               <div className="mt-10 space-y-4 pt-8 border-t border-border">
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-text-muted">Sugestões de Rota</h4>
                 <div className="space-y-3">
                   {data?.recomendacoes.length === 0 ? (
                      <p className="text-xs text-text-muted italic">A Tina está a processar cursos compatíveis com a tua biomecânica...</p>
                   ) : data?.recomendacoes.map(rec => (
                     <div key={rec.cursoId} className="group p-4 rounded-2xl bg-surface-alt border border-border hover:border-accent/30 transition-all flex items-center justify-between">
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-text-primary truncate">{rec.titulo}</h4>
                          <p className="text-[9px] text-text-muted font-bold uppercase tracking-tight mt-0.5">{rec.matchPercentagem}% Match</p>
                        </div>
                        <ChevronRight size={16} className="text-text-muted group-hover:text-accent transition-colors" />
                     </div>
                   ))}
                 </div>
               </div>
            </Card>
          </div>
        </div>

        {/* Call to Action Soberana */}
        <footer className="pt-20 text-center flex flex-col items-center gap-8">
           <div className="h-px w-32 bg-gradient-to-r from-transparent via-border to-transparent" />
           <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.4em]">
             Validado pelo Comitê Científico PDC | Angola 2026
           </p>
        </footer>
      </div>
    </div>
  );
};

const Star = ({ size, className }: { size: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);


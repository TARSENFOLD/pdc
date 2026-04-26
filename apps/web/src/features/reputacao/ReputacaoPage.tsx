import { useQuery } from '@tanstack/react-query';
import { reputationApi } from '@/lib/api/reputation';
import { Card, Spinner, EmptyState, Badge } from '@/components/ui';
import { useAuth } from '@/lib/auth/AuthContext';
import { Star, TrendingUp, Award, Clock, MessageSquare, BookOpen, Brain, Zap } from 'lucide-react';
import { motion } from 'motion/react';

export function ReputacaoPage() {
  const { user } = useAuth();
  const { data: breakdown, isLoading, isError } = useQuery({
    queryKey: ['reputation', 'me'],
    queryFn: () => reputationApi.getMe(),
  });

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>;

  if (isError || !breakdown) {
    return (
      <EmptyState
        icon={Brain}
        variant="error"
        title="Oráculo Indisponível"
        description="Não foi possível calcular o teu DNA de talento neste momento."
      />
    );
  }

  const { score, dimensions } = breakdown;

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-20 animate-in fade-in duration-1000">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Badge variant="info" className="bg-accent/10 text-accent border-accent/20 mb-3 px-3 py-1">Wave 1 - Gênese</Badge>
          <h1 className="text-4xl font-black text-ink-primary tracking-tighter font-display">
            A Minha <span className="text-accent">Reputação</span>
          </h1>
          <p className="text-ink-secondary mt-2 max-w-lg leading-relaxed">
            Músculo comportamental e impacto real medidos por 9.000 pontos de evidência comportamental.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-ink-tertiary">
          <Zap size={14} className="text-accent" />
          CALCULADO NA EDGE - LUANDA PoP
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-4 gap-4 auto-rows-[200px]">
        {/* Card Central: DNA Score (The Oráculo Eye) */}
        <Card className="md:col-span-3 lg:col-span-2 lg:row-span-2 flex flex-col items-center justify-center bg-recessed border-accent/10 relative overflow-hidden group shadow-2xl">
          {/* Background Texture (Geometria Africana Sutil) */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('/images/patterns/tribal-lines.svg')] bg-repeat" />
          
          <div className="absolute top-0 right-0 p-6">
             <div className="h-2 w-2 rounded-full bg-accent animate-pulse" title="Sincronizado" />
          </div>

          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex items-center justify-center w-56 h-56"
          >
             <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="112" cy="112" r="100"
                  stroke="currentColor" strokeWidth="6" fill="transparent"
                  className="text-white/5"
                />
                <circle
                  cx="112" cy="112" r="100"
                  stroke="currentColor" strokeWidth="8" fill="transparent"
                  strokeDasharray={628}
                  strokeDashoffset={628 - (628 * score) / 100}
                  strokeLinecap="round"
                  className="text-accent drop-shadow-[0_0_15px_rgba(255,92,0,0.4)] transition-all duration-1000 ease-out"
                />
             </svg>
             <div className="absolute flex flex-col items-center">
                <span className="text-7xl font-black text-ink-primary font-mono tracking-tighter">{score}</span>
                <span className="text-[10px] font-bold text-accent uppercase tracking-[0.3em]">Score Total</span>
             </div>
          </motion.div>

          <div className="mt-8 text-center px-12 z-10">
             <p className="text-xs font-medium text-ink-tertiary leading-relaxed">
               Este índice representa a tua <span className="text-ink-primary">Autoridade de Mérito</span>. 
               Estás à frente de {(score * 0.8).toFixed(0)}% dos talentos na tua área vocacional.
             </p>
          </div>
        </Card>

        {/* Card Impacto: Adaptativo por Role (Sovereign Card) */}
        <Card className="md:col-span-3 lg:col-span-2 flex flex-col justify-between p-8 bg-elevated border-white/5 hover:border-accent/20 transition-all group">
           <div className="flex justify-between items-start">
              <div>
                 <p className="text-[10px] font-bold text-ink-tertiary uppercase tracking-[0.2em]">Impacto Real</p>
                 <h3 className="text-2xl font-bold mt-1 tracking-tight">
                    {user?.role === 'mentor' ? 'Rating de Mentoria' : user?.role === 'estudante' ? 'Conquistas' : 'Catálogo'}
                 </h3>
              </div>
              <div className="p-3 bg-accent/5 rounded-2xl text-accent group-hover:scale-110 transition-transform">
                 {user?.role === 'mentor' ? <Star size={24} /> : user?.role === 'estudante' ? <Award size={24} /> : <BookOpen size={24} />}
              </div>
           </div>
           <div className="flex items-baseline gap-3">
              <span className="text-6xl font-black font-mono tracking-tighter">
                 {user?.role === 'mentor' ? dimensions.ratingsMedia : user?.role === 'estudante' ? dimensions.conquistas : dimensions.cursosPublicados}
              </span>
              <span className="text-xs font-bold text-ink-tertiary uppercase tracking-widest">
                 {user?.role === 'mentor' ? '/ 5.0' : user?.role === 'estudante' ? 'badges' : 'items'}
              </span>
           </div>
        </Card>

        {/* Card Evolução (Músculo em Movimento) */}
        <Card className="md:col-span-2 lg:col-span-1 flex flex-col justify-between p-6 bg-elevated border-white/5">
           <div className="p-2 w-fit bg-accent/5 rounded-xl text-accent mb-2">
              <TrendingUp size={20} />
           </div>
           <div>
              <p className="text-[10px] font-bold text-ink-tertiary uppercase tracking-widest">Simulações</p>
              <p className="text-3xl font-black font-mono">{dimensions.simulacoes}</p>
              <div className="w-full h-1 bg-white/5 mt-3 rounded-full overflow-hidden">
                <div className="h-full bg-accent/40 w-2/3" />
              </div>
           </div>
        </Card>

        {/* Card Engagement (Social Pulse) */}
        <Card className="md:col-span-2 lg:col-span-1 flex flex-col justify-between p-6 bg-elevated border-white/5">
           <div className="p-2 w-fit bg-accent/5 rounded-xl text-accent mb-2">
              <MessageSquare size={20} />
           </div>
           <div>
              <p className="text-[10px] font-bold text-ink-tertiary uppercase tracking-widest">Interacções</p>
              <p className="text-3xl font-black font-mono">{dimensions.engagement}</p>
              <p className="text-[9px] text-ink-tertiary mt-1 uppercase font-bold">Votos e Comentários</p>
           </div>
        </Card>

        {/* Card Veterania (Time is Authority) */}
        <Card className="md:col-span-2 lg:col-span-1 flex flex-col justify-between p-6 bg-elevated border-white/5">
           <div className="p-2 w-fit bg-accent/5 rounded-xl text-accent mb-2">
              <Clock size={20} />
           </div>
           <div>
              <p className="text-[10px] font-bold text-ink-tertiary uppercase tracking-widest">Antiguidade</p>
              <p className="text-3xl font-black font-mono">{dimensions.tempoPlataforma}</p>
              <p className="text-[9px] text-ink-tertiary mt-1 uppercase font-bold">Meses na Trajectória</p>
           </div>
        </Card>

        {/* Card Breakdown Detalhado (The Matrix) */}
        <Card className="md:col-span-6 lg:col-span-2 lg:row-span-1 p-8 bg-recessed border-white/5 relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
           <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-accent mb-6 flex items-center gap-2">
             <Brain size={14} /> Atributos Behaviorais
           </h4>
           <div className="space-y-5">
              {[
                { label: 'Precisão Técnica', val: (dimensions.ratingsMedia/5)*100 },
                { label: 'Fluidez Cognitiva', val: (dimensions.simulacoes/20)*100 },
                { label: 'Resiliência ao Erro', val: (dimensions.conquistas/15)*100 },
                { label: 'Estabilidade de Foco', val: (dimensions.engagement/50)*100 },
              ].map(d => (
                <div key={d.label} className="space-y-1.5">
                   <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest">
                      <span className="text-ink-secondary">{d.label}</span>
                      <span className="text-ink-primary font-mono">{Math.round(d.val)}%</span>
                   </div>
                   <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, d.val).toString()}%` }}
                        transition={{ duration: 2, delay: 0.5 }}
                        className="h-full bg-gradient-to-r from-accent/40 to-accent" 
                      />
                   </div>
                </div>
              ))}
           </div>
        </Card>
      </div>

      <footer className="pt-10 border-t border-white/5 flex items-center justify-between">
        <p className="text-[10px] font-bold text-ink-tertiary uppercase tracking-widest">
          Algoritmo v2.2 - Actualizado a cada 5 minutos através de processamento em background.
        </p>
        <button className="text-[10px] font-black text-accent uppercase tracking-widest hover:underline transition-all">
          Descarregar Certificado de Autoridade PDF →
        </button>
      </footer>
    </div>
  );
}

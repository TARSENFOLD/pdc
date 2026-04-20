import { useAuth } from '@/lib/auth/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { http } from '@/lib/api/http';
import { Card, Spinner, Badge } from '@/components/ui';
import { 
  Users, 
  Brain, 
  Target, 
  Activity, 
  ChevronRight, 
  ShieldCheck, 
  Zap,
  Clock
} from 'lucide-react';
import { motion } from 'motion/react';

interface AlunoPattern {
  perfil: { id: string; nome: string; avatarUrl?: string };
  cognitiveFluidity: number;
  resilienceIndex: number;
  hesitationIndex: number;
  technicalScore: number;
  lastUpdatedAt: string;
}

export function MentorDashboard() {
  const { user } = useAuth();

  // Buscar todos os padrões behaviorais para os alunos sob orientação
  const { data: patterns, isLoading } = useQuery<AlunoPattern[]>({
    queryKey: ['mentor', 'patterns'],
    queryFn: () => http.get<AlunoPattern[]>('/telemetria/patterns'),
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* Header Soberano */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-border pb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-black uppercase tracking-widest mb-4">
             <ShieldCheck size={12} /> Painel de Decisão do Mentor
          </div>
          <h1 className="text-4xl font-black text-text-primary tracking-tighter sm:text-5xl font-display">
            Gestão de <span className="text-accent">Talentos.</span>
          </h1>
          <p className="text-text-secondary mt-2 text-lg">Olá, {user?.nome}. Audita a biomecânica e o mérito dos teus orientandos.</p>
        </div>
        
        <div className="flex gap-4">
          <Card className="px-6 py-4 bg-surface-raised border-border flex items-center gap-4">
            <Users size={24} className="text-accent" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Total Orientandos</p>
              <p className="text-2xl font-black font-mono text-text-primary">{patterns?.length || 0}</p>
            </div>
          </Card>
        </div>
      </header>

      {/* Grid de Talentos (Bento Style) */}
      <div className="grid grid-cols-1 gap-6">
        <h2 className="text-xl font-black text-text-primary tracking-tight flex items-center gap-2 uppercase text-[12px] tracking-[0.2em]">
          <Activity size={16} className="text-accent" /> Auditoria de Músculo Cognitivo
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {patterns?.length === 0 ? (
            <Card className="col-span-full p-12 flex flex-col items-center justify-center text-center bg-surface-raised/50 border-dashed border-2 border-border">
              <Users size={48} className="text-text-muted opacity-20 mb-4" />
              <p className="text-text-secondary font-medium">Aguardando as primeiras simulações dos teus alunos para gerar dados de mérito.</p>
            </Card>
          ) : patterns?.map((p, i) => (
            <motion.div
              key={p.perfil.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="p-6 bg-surface hover:bg-surface-raised transition-all border-border shadow-xl hover:shadow-2xl rounded-[32px] group overflow-hidden relative">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 blur-2xl rounded-full -translate-y-1/2 translate-x-1/2" />
                
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-12 w-12 rounded-2xl bg-accent text-white flex items-center justify-center font-black text-xl shadow-lg shadow-accent/20">
                    {p.perfil.nome[0]}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-black text-text-primary truncate">{p.perfil.nome}</h3>
                    <div className="flex items-center gap-2 text-[10px] text-text-muted font-bold uppercase tracking-widest">
                       <Clock size={10} /> {new Date(p.lastUpdatedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Métricas Biomecânicas */}
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-text-muted">
                      <Zap size={10} className="text-accent" /> Fluidez (\u03D5)
                    </div>
                    <span className="text-sm font-mono font-black text-text-primary">{p.cognitiveFluidity.toFixed(1)}</span>
                  </div>
                  <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                    <div className="h-full bg-accent" style={{ width: `${p.cognitiveFluidity * 10}%` }} />
                  </div>

                  <div className="flex justify-between items-end">
                    <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-text-muted">
                      <Brain size={10} className="text-emerald-500" /> Decisão
                    </div>
                    <span className="text-sm font-mono font-black text-text-primary">{(10 - p.hesitationIndex).toFixed(1)}</span>
                  </div>
                  <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${(10 - p.hesitationIndex) * 10}%` }} />
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-border flex items-center justify-between">
                  <Badge variant="secondary" className="bg-accent/5 text-accent border-accent/10 font-black text-[9px]">
                    SCORE: {p.technicalScore.toFixed(1)}
                  </Badge>
                  <button className="text-accent flex items-center gap-1 text-[10px] font-black uppercase tracking-widest group-hover:gap-2 transition-all">
                    Ver Auditoria <ChevronRight size={14} />
                  </button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Acções Pendentes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-8 bg-surface-alt border-border rounded-[40px]">
          <h3 className="text-[11px] font-black text-text-muted uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
            <Target size={14} className="text-accent" /> Talent Bounties Pendentes
          </h3>
          <p className="text-sm text-text-muted italic">Nenhuma recompensa de mérito para aprovar hoje. O Oráculo está estável.</p>
        </Card>
        
        <Card className="p-8 bg-surface-alt border-border rounded-[40px]">
          <h3 className="text-[11px] font-black text-text-muted uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
            <ShieldCheck size={14} className="text-accent" /> Validação de Identidade
          </h3>
          <div className="space-y-4">
             <p className="text-xs text-text-secondary leading-relaxed">
               De acordo com a ADR-017, a validação de novos talentos deve seguir o critério de biomecânica rigorosa.
             </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

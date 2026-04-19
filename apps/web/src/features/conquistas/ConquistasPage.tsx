import { useQuery } from '@tanstack/react-query';
import { conquistasApi } from '@/lib/api/conquistas';
import { Spinner, Card, EmptyState, Badge } from '@/components/ui';
import type { Conquista } from '@pdc/shared';
import { cn } from '@/lib/utils';
import { Trophy, ShieldCheck, Lock, Zap, Star, Target, Activity } from 'lucide-react';
import { motion } from 'motion/react';

const ICON_MAP: Record<string, any> = {
  'explorador-vocacional': Target,
  'conclusao-de-curso': Trophy,
  'rede-em-crescimento': Zap,
  'perfil-completo': ShieldCheck,
  'assiduidade-exemplar': Activity,
  'primeiro-curso': Star,
};

function ConquistaCard({ conquista, index }: { conquista: Conquista; index: number }) {
  const Icon = ICON_MAP[conquista.slug] || Trophy;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card
        className={cn(
          'relative flex flex-col items-center gap-5 p-8 text-center transition-all border-white/5 overflow-hidden group',
          !conquista.desbloqueada ? 'bg-surface/40 opacity-50 grayscale' : 'bg-surface shadow-xl hover:border-accent/30'
        )}
      >
        {/* Background Decor */}
        {conquista.desbloqueada && (
          <div className="absolute -top-12 -right-12 h-24 w-24 rounded-full bg-accent/5 blur-2xl group-hover:bg-accent/10 transition-all" />
        )}

        <div className={cn(
          "h-16 w-16 rounded-2xl flex items-center justify-center border transition-all duration-500",
          conquista.desbloqueada 
            ? "bg-accent/10 border-accent/20 text-accent group-hover:scale-110 shadow-lg shadow-accent/5" 
            : "bg-white/5 border-white/10 text-text-muted"
        )}>
          {conquista.desbloqueada ? <Icon size={32} /> : <Lock size={24} />}
        </div>

        <div>
          <h3 className="font-bold text-text-primary group-hover:text-accent transition-colors tracking-tight">
            {conquista.titulo}
          </h3>
          <p className="mt-2 text-xs text-text-secondary leading-relaxed line-clamp-2">
            {conquista.descricao}
          </p>
        </div>

        {conquista.desbloqueada ? (
          <div className="mt-2 space-y-3">
             <Badge variant="success" className="text-[9px] font-black tracking-widest">
               Verificada
             </Badge>
             {conquista.dataDesbloqueio && (
               <p className="text-[10px] text-text-muted font-medium">
                 {new Date(conquista.dataDesbloqueio).toLocaleDateString('pt-PT', {
                   day: '2-digit',
                   month: 'short',
                   year: 'numeric',
                 })}
               </p>
             )}
          </div>
        ) : (
          <div className="mt-2">
            <Badge variant="outline" className="text-[9px] font-black tracking-widest border-white/5 bg-white/5">
              Bloqueada
            </Badge>
          </div>
        )}

        {/* Glossy Overlay for unlocked */}
        {conquista.desbloqueada && (
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        )}
      </Card>
    </motion.div>
  );
}

export function ConquistasPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['conquistas', 'minhas'],
    queryFn: conquistasApi.minhas,
  });

  const conquistas = data?.data ?? [];
  const desbloqueadas = conquistas.filter((c) => c.desbloqueada).length;

  return (
    <div className="mx-auto max-w-7xl space-y-10 pb-20 px-4 sm:px-6 lg:px-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-bold uppercase tracking-widest">
             <Trophy size={12} /> Quadro de Prestígio
          </div>
          <h1 className="text-4xl font-black text-text-primary tracking-tighter sm:text-5xl font-display">
            As tuas <span className="text-accent">Conquistas.</span>
          </h1>
          <p className="text-text-secondary text-lg">Constrói a tua autoridade através de marcos verificados pelo Oráculo.</p>
        </div>

        {!isLoading && conquistas.length > 0 && (
          <div className="glass-surface px-6 py-4 rounded-2xl border-white/5 shadow-xl flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] text-text-muted font-black uppercase tracking-widest">Progresso de Mérito</span>
              <span className="font-mono font-black text-2xl tracking-tighter">
                {desbloqueadas} <span className="text-text-muted text-sm">/ {conquistas.length}</span>
              </span>
            </div>
            <div className="h-12 w-12 rounded-full border-4 border-white/5 flex items-center justify-center relative">
               <svg className="absolute inset-0 w-full h-full -rotate-90">
                 <circle cx="24" cy="24" r="20" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-accent" strokeDasharray={125.6} strokeDashoffset={125.6 - (desbloqueadas/conquistas.length)*125.6} />
               </svg>
               <Trophy size={16} className="text-accent" />
            </div>
          </div>
        )}
      </header>

      {isLoading ? (
        <div className="flex justify-center py-32">
          <Spinner size="lg" />
        </div>
      ) : isError ? (
        <EmptyState
          icon={Trophy}
          variant="error"
          title="Erro ao sincronizar conquistas"
          description="A ligação ao motor de mérito falhou. Tenta novamente em alguns instantes."
        />
      ) : conquistas.length === 0 ? (
        <div className="py-24">
          <EmptyState
            icon={Zap}
            title="O Teu Legado Começa Aqui"
            description="Ainda não desbloqueaste marcos oficiais. Realiza simulações, conclui módulos ou conecta-te com mentores para elevar o teu estatuto no PDC."
            ctaLabel="Iniciar Primeiro Desafio"
            ctaTo="/app/simulacoes"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {conquistas.map((c, idx) => (
            <ConquistaCard key={c.id} conquista={c} index={idx} />
          ))}
        </div>
      )}

      {/* Benefits Callout */}
      {desbloqueadas > 0 && (
        <Card className="p-10 bg-accent/5 border-accent/10 rounded-[32px] flex flex-col md:flex-row items-center gap-10 border-dashed mt-12">
           <div className="h-20 w-20 rounded-3xl bg-accent flex items-center justify-center text-white shadow-2xl shrink-0 rotate-3">
              <ShieldCheck size={40} />
           </div>
           <div className="space-y-2 text-center md:text-left">
              <h4 className="text-xl font-bold text-text-primary">O teu mérito desbloqueia portas.</h4>
              <p className="text-text-secondary leading-relaxed">
                As tuas conquistas são visíveis para instituições de elite e potenciais patrocinadores. 
                Continua a acumular evidências para aumentar a tua visibilidade no **Hub de Oportunidades**.
              </p>
           </div>
        </Card>
      )}
    </div>
  );
}

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, Spinner, Avatar, Badge, EmptyState } from '@/components/ui';
import { http } from '@/lib/api/http';
import { MessageSquare, Zap, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

interface ConversaInfo {
  id: string;
  interlocutorId: string;
  interlocutorNome: string;
  interlocutorFoto?: string;
  ultimaMensagem?: string;
  naoLidas: number;
  updatedAt: string;
}

export function MensagensPage() {

  const { data, isLoading } = useQuery({
    queryKey: ['mensagens', 'conversas'],
    queryFn: () => http.get<{ data: ConversaInfo[] }>('/mensagens/conversas'),
    refetchInterval: 30000,
  });

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>;

  const conversas = data?.data ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-10 pb-20 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
        <div>
          <Badge variant="info" className="bg-accent/10 text-accent border-accent/20 mb-3 px-3 py-1 uppercase tracking-widest text-[9px] font-black">Communication Hub</Badge>
          <h1 className="text-4xl font-black text-text-primary tracking-tighter font-display">
            As Minhas <span className="text-accent">Conversas</span>
          </h1>
          <p className="text-text-secondary mt-2 max-w-lg leading-relaxed text-sm">
            Consultas técnicas e orientações de mentoria em tempo real.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3">
        {conversas.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="Sinal de Silêncio"
            description="Ainda não iniciaste nenhuma consulta técnica. Conecta-te com mentores para começar."
            ctaLabel="Explorar Mentores"
            ctaTo="/app/explorar?tab=mentores"
          />
        ) : (
          conversas.map((c, idx) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Link to={`/app/mensagens/${c.id}`}>
                <Card className="p-6 flex items-center gap-6 bg-surface border-white/5 hover:border-accent/30 transition-all group shadow-xl">
                  <div className="relative">
                     <Avatar src={c.interlocutorFoto} fallback={c.interlocutorNome[0]} className="h-16 w-16 border-2 border-white/10 group-hover:border-accent/40 transition-all" />
                     {c.naoLidas > 0 && (
                        <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-accent border-4 border-surface flex items-center justify-center text-[8px] font-black text-white">
                           {c.naoLidas}
                        </div>
                     )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="text-lg font-bold text-text-primary group-hover:text-accent transition-colors">{c.interlocutorNome}</h3>
                      <span className="text-[10px] font-mono text-text-muted uppercase">
                        {new Date(c.updatedAt).toLocaleDateString('pt-PT')}
                      </span>
                    </div>
                    
                    <p className={`text-sm truncate leading-relaxed ${c.naoLidas > 0 ? 'text-text-primary font-bold' : 'text-text-secondary'}`}>
                      {c.ultimaMensagem || 'Inicia a trajectória de mentoria...'}
                    </p>
                  </div>

                  <ChevronRight size={20} className="text-text-muted group-hover:translate-x-1 group-hover:text-accent transition-all" />
                </Card>
              </Link>
            </motion.div>
          ))
        )}
      </div>

      <footer className="pt-10 flex justify-center">
         <p className="text-[9px] font-bold text-text-muted uppercase tracking-[0.3em] flex items-center gap-2">
            <Zap size={14} className="text-accent" />
            Comunicação Realtime assegurada pelo PDC Soberano Engine.
         </p>
      </footer>
    </div>
  );
}

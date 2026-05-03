import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Spinner, Avatar, EmptyState } from '@/components/ui';
import { http } from '@/lib/api/http';
import { MessageSquare, Zap, Search, User } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  const conversas = data?.data ?? [];

  return (
    <div className="flex h-[calc(100vh-100px)] gap-4 animate-in fade-in duration-500 max-w-7xl mx-auto pb-4">
      
      {/* Esquerda: Lista de Conversas (Visível 100% em Mobile, 320px em Desktop) */}
      <aside className="w-full lg:w-80 flex flex-col bg-elevated border border-ink-tertiary/[0.08] rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-ink-tertiary/[0.08] bg-surface">
          <h2 className="text-sm font-black uppercase tracking-widest text-ink-primary mb-3">Mensagens</h2>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary" />
            <input 
              type="text" 
              placeholder="Procurar conversa..." 
              className="w-full bg-recessed text-sm rounded-lg pl-9 pr-3 py-2 border-none focus:ring-1 focus:ring-accent transition-shadow text-ink-primary placeholder:text-ink-tertiary"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading ? (
            <div className="flex justify-center p-8"><Spinner size="sm" /></div>
          ) : conversas.length === 0 ? (
            <div className="p-6 text-center lg:hidden">
              <EmptyState
                icon={MessageSquare}
                title="Sinal de Silêncio"
                description="Sem conversas ativas."
                ctaLabel="Explorar"
                ctaTo="/app/explorar?tab=mentores"
              />
            </div>
          ) : (
            conversas.map(c => (
              <Link 
                key={c.id} 
                to={`/app/mensagens/${c.id}`}
                className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-recessed"
              >
                <div className="relative">
                   <Avatar src={c.interlocutorFoto} fallback={c.interlocutorNome[0]} size="sm" className="h-10 w-10 border border-ink-tertiary/[0.08]" />
                   {c.naoLidas > 0 && (
                      <div className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-accent border-2 border-elevated" />
                   )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-sm font-semibold text-ink-primary truncate">{c.interlocutorNome}</span>
                    <span className="text-[9px] text-ink-tertiary">
                       {new Date(c.updatedAt).toLocaleDateString('pt-PT')}
                    </span>
                  </div>
                  <p className={cn(
                    "text-xs truncate",
                    c.naoLidas > 0 ? "text-ink-primary font-bold" : "text-ink-secondary"
                  )}>{c.ultimaMensagem || 'Nova conversa'}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      </aside>

      {/* Centro: Chat Empty State (Escondido em Mobile) */}
      <div className="hidden lg:flex flex-1 flex-col bg-elevated border border-ink-tertiary/[0.08] rounded-2xl overflow-hidden shadow-sm items-center justify-center p-8 text-center relative">
         <div className="absolute inset-0 bg-recessed/30" />
         <div className="relative z-10 w-full max-w-md mx-auto">
            <EmptyState
              icon={MessageSquare}
              title="Sinal de Silêncio"
              description="Ainda não iniciaste nenhuma consulta técnica. Seleciona uma conversa ao lado ou conecta-te com mentores para começar."
              ctaLabel="Explorar Mentores"
              ctaTo="/app/explorar?tab=mentores"
            />
         </div>
         <footer className="absolute bottom-6 left-0 right-0 flex justify-center z-10">
           <p className="text-[9px] font-bold text-ink-tertiary uppercase tracking-[0.3em] flex items-center gap-2">
              <Zap size={14} className="text-accent" />
              Comunicação Realtime
           </p>
         </footer>
      </div>

      {/* Direita: Perfil Contextual Empty State (Escondido em Mobile/Tablet) */}
      <aside className="hidden xl:flex w-72 bg-elevated border border-ink-tertiary/[0.08] rounded-2xl shadow-sm flex-col items-center justify-center text-center p-6 text-ink-tertiary">
         <User size={48} className="mb-4 opacity-20" />
         <p className="text-xs uppercase tracking-widest font-black opacity-40">Perfil Contextual</p>
      </aside>
    </div>
  );
}

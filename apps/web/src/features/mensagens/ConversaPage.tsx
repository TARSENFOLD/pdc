import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Spinner, Avatar, Card } from '@/components/ui';
import { useAuth } from '@/lib/auth/AuthContext';
import { http } from '@/lib/api/http';
import { useSocket } from '@/hooks/useSocket';
import { ArrowLeft, Send, Zap, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { type Mensagem } from '@pdc/shared';
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

function isMensagem(value: unknown): value is Mensagem {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'conversaId' in value &&
    typeof value.conversaId === 'string' &&
    'conteudo' in value &&
    typeof value.conteudo === 'string'
  );
}

export function ConversaPage() {
  const { conversaId } = useParams<{ conversaId: string }>();
  const navigate = useNavigate();
  const [novoConteudo, setNovoConteudo] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: conversasData, isLoading: loadingConversas } = useQuery({
    queryKey: ['mensagens', 'conversas'],
    queryFn: () => http.get<{ data: ConversaInfo[] }>('/mensagens/conversas'),
    refetchInterval: 30000,
  });

  const conversas = conversasData?.data ?? [];
  const conversaAtual = conversas.find(c => c.id === conversaId);

  useSocket((novaMsg) => {
    if (!isMensagem(novaMsg)) return;
    if (novaMsg.conversaId === conversaId) {
      void queryClient.setQueryData<{ data: Mensagem[] }>(['mensagens', 'conversa', conversaId], (old) => ({
        data: [...(old?.data ?? []), novaMsg]
      }));
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  });

  const { data: mensagens, isLoading: loadingMensagens } = useQuery({
    queryKey: ['mensagens', 'conversa', conversaId],
    queryFn: () => http.get<{ data: Mensagem[] }>(`/mensagens/conversas/${conversaId ?? ''}`),
    enabled: !!conversaId,
  });

  const enviarMutation = useMutation({
    mutationFn: (conteudo: string) => http.post(`/mensagens/conversas/${conversaId ?? ''}`, { conteudo }),
    onSuccess: () => {
      setNovoConteudo('');
      void queryClient.invalidateQueries({ queryKey: ['mensagens', 'conversas'] });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens?.data]);

  const handleSend = () => {
    if (novoConteudo.trim()) {
      enviarMutation.mutate(novoConteudo.trim());
    }
  };

  return (
    <div className="flex h-[calc(100vh-100px)] gap-4 animate-in fade-in duration-500 max-w-7xl mx-auto pb-4">
      
      {/* Esquerda: Lista de Conversas (Escondida em Mobile, visível a partir de lg) */}
      <aside className="hidden lg:flex flex-col w-80 bg-elevated border border-ink-tertiary/[0.08] rounded-2xl overflow-hidden shadow-sm">
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
          {loadingConversas ? (
            <div className="flex justify-center p-8"><Spinner size="sm" /></div>
          ) : conversas.map(c => (
            <Link 
              key={c.id} 
              to={`/app/mensagens/${c.id}`}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl transition-colors",
                conversaId === c.id ? "bg-accent/10" : "hover:bg-recessed"
              )}
            >
              <div className="relative">
                 <Avatar src={c.interlocutorFoto} fallback={c.interlocutorNome[0]} size="sm" className="h-10 w-10 border border-ink-tertiary/[0.08]" />
                 {c.naoLidas > 0 && c.id !== conversaId && (
                    <div className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-accent border-2 border-elevated" />
                 )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                  <span className={cn(
                    "text-sm truncate",
                    conversaId === c.id ? "font-bold text-accent" : "font-semibold text-ink-primary"
                  )}>{c.interlocutorNome}</span>
                  <span className="text-[9px] text-ink-tertiary">
                     {new Date(c.updatedAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className={cn(
                  "text-xs truncate",
                  c.naoLidas > 0 && c.id !== conversaId ? "text-ink-primary font-bold" : "text-ink-secondary"
                )}>{c.ultimaMensagem || 'Nova conversa'}</p>
              </div>
            </Link>
          ))}
        </div>
      </aside>

      {/* Centro: Chat */}
      <div className="flex-1 flex flex-col bg-elevated border border-ink-tertiary/[0.08] rounded-2xl overflow-hidden shadow-sm">
        <header className="p-4 border-b border-ink-tertiary/[0.08] bg-surface flex items-center justify-between">
           <div className="flex items-center gap-3">
              <button onClick={() => { navigate('/app/mensagens'); }} className="p-2 -ml-2 text-ink-secondary hover:text-ink-primary lg:hidden">
                 <ArrowLeft size={18} />
              </button>
              <Avatar src={conversaAtual?.interlocutorFoto} fallback={conversaAtual?.interlocutorNome?.[0] ?? 'U'} className="h-9 w-9 border border-ink-tertiary/[0.08]" />
              <div>
                 <h2 className="text-sm font-bold text-ink-primary leading-tight">{conversaAtual?.interlocutorNome ?? 'A carregar...'}</h2>
                 <p className="text-[10px] text-ink-secondary flex items-center gap-1"><Zap size={10} className="text-accent" /> Ligação Ativa</p>
              </div>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-recessed/30">
          {loadingMensagens ? (
            <div className="flex justify-center py-20"><Spinner size="md" /></div>
          ) : (
            <AnimatePresence>
              {mensagens?.data.map((msg) => {
                const isMine = msg.remetenteId === user?.id;
                return (
                  <motion.div 
                    key={msg.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn("flex", isMine ? "justify-end" : "justify-start")}
                  >
                    <div className="max-w-[85%] sm:max-w-[70%] space-y-1">
                       <div className={cn(
                         "px-4 py-2.5 text-[15px] leading-relaxed shadow-sm",
                         isMine 
                          ? "bg-accent text-white rounded-2xl rounded-tr-sm" 
                          : "bg-surface border border-ink-tertiary/[0.08] text-ink-primary rounded-2xl rounded-tl-sm"
                       )}>
                          {msg.conteudo}
                       </div>
                       <span className={cn("text-[10px] text-ink-tertiary block", isMine ? "text-right" : "text-left")}>
                          {new Date(msg.createdAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                       </span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
          <div ref={messagesEndRef} />
        </div>

        <footer className="p-4 bg-surface border-t border-ink-tertiary/[0.08]">
           <div className="flex items-center gap-3 bg-recessed border border-ink-tertiary/[0.08] rounded-xl p-1.5 focus-within:border-accent/30 focus-within:ring-1 focus-within:ring-accent/30 transition-all">
              <textarea
                value={novoConteudo}
                onChange={(e) => { setNovoConteudo(e.target.value); }}
                onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
                placeholder="Escreve uma mensagem..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 px-3 resize-none max-h-32 text-ink-primary placeholder:text-ink-tertiary"
                rows={1}
              />
              <Button onClick={handleSend} disabled={!novoConteudo.trim()} className="h-9 w-9 rounded-lg bg-accent hover:bg-accent/90 text-white p-0 shrink-0 shadow-sm">
                 <Send size={16} />
              </Button>
           </div>
        </footer>
      </div>

      {/* Direita: Perfil Contextual */}
      <aside className="hidden xl:block w-72 space-y-4">
         <Card className="p-6 bg-elevated border-ink-tertiary/[0.08] rounded-2xl shadow-sm flex flex-col items-center text-center">
            <Avatar src={conversaAtual?.interlocutorFoto} fallback={conversaAtual?.interlocutorNome?.[0] ?? 'U'} className="h-20 w-20 mb-4 border-2 border-surface shadow-sm" />
            <h3 className="text-base font-bold text-ink-primary tracking-tight mb-1">{conversaAtual?.interlocutorNome ?? 'Utilizador'}</h3>
            <p className="text-xs text-ink-secondary mb-6">Membro PDC</p>
            
            <div className="w-full pt-4 border-t border-ink-tertiary/[0.08] space-y-3">
              <Button 
                variant="outline" 
                className="w-full text-xs h-9 bg-transparent border-ink-tertiary/[0.2] hover:bg-recessed text-ink-primary" 
                onClick={() => { if(conversaAtual) navigate(`/app/perfil/${conversaAtual.interlocutorId}`); }}
              >
                Ver Perfil
              </Button>
            </div>
         </Card>
      </aside>
    </div>
  );
}


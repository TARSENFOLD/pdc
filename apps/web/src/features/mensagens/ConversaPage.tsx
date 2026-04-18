import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Spinner, Avatar, Card } from '@/components/ui';
import { useAuth } from '@/lib/auth/AuthContext';
import { http } from '@/lib/api/http';
import { useSocket } from '@/hooks/useSocket';
import { ArrowLeft, Send, Brain, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Mensagem {
  id: string;
  conversaId: string;
  remetenteId: string;
  conteudo: string;
  lida: boolean;
  createdAt: string;
}

export function ConversaPage() {
  const { conversaId } = useParams<{ conversaId: string }>();
  const navigate = useNavigate();
  const [novoConteudo, setNovoConteudo] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useSocket((novaMsg: Mensagem) => {
    if (novaMsg.conversaId === conversaId) {
      void queryClient.setQueryData(['mensagens', 'conversa', conversaId], (old: any) => ({
        ...old,
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
    mutationFn: (conteudo: string) => http.post(`/mensagens/conversas/${conversaId}`, { conteudo }),
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
    <div className="flex flex-col lg:flex-row h-[calc(100vh-120px)] gap-4 animate-in fade-in duration-700">
      <div className="flex-1 flex flex-col bg-surface border border-white/5 rounded-[32px] overflow-hidden shadow-2xl">
        <header className="p-6 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
           <div className="flex items-center gap-4">
              <button onClick={() => navigate('/app/mensagens')} className="p-2 hover:bg-white/5 rounded-xl lg:hidden">
                 <ArrowLeft size={18} />
              </button>
              <Avatar src="" fallback="C" className="h-10 w-10 border border-white/10" />
              <div>
                 <h2 className="text-sm font-black text-text-primary uppercase tracking-widest">Canal de Mentoria</h2>
                 <p className="text-[10px] text-success font-bold flex items-center gap-1"><Zap size={10} className="fill-success" /> Ligação Realtime Activa</p>
              </div>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {loadingMensagens ? (
            <div className="flex justify-center py-20"><Spinner size="lg" /></div>
          ) : (
            <AnimatePresence>
              {mensagens?.data.map((msg) => (
                <motion.div 
                  key={msg.id}
                  initial={{ opacity: 0, x: msg.remetenteId === user?.id ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex ${msg.remetenteId === user?.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="max-w-[70%] space-y-1">
                     <div className={`px-5 py-3.5 rounded-[22px] text-sm leading-relaxed ${
                       msg.remetenteId === user?.id 
                        ? 'bg-accent text-white rounded-tr-none shadow-lg shadow-accent/10' 
                        : 'bg-surface-alt border border-white/5 text-text-primary rounded-tl-none'
                     }`}>
                        {msg.conteudo}
                     </div>
                     <span className="text-[9px] font-mono text-text-muted uppercase px-2 block text-right">
                        {new Date(msg.createdAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                     </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
          <div ref={messagesEndRef} />
        </div>

        <footer className="p-6 bg-white/[0.01] border-t border-white/5">
           <div className="flex items-center gap-4 bg-surface-alt border border-white/5 rounded-2xl p-2 px-4 focus-within:border-accent/40 transition-all">
              <textarea
                value={novoConteudo}
                onChange={(e) => setNovoConteudo(e.target.value)}
                onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
                placeholder="Escreve uma consulta técnica..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 resize-none max-h-32"
                rows={1}
              />
              <Button onClick={handleSend} disabled={!novoConteudo.trim()} size="md" className="h-10 w-10 rounded-xl bg-accent hover:bg-accent-hover text-white p-0">
                 <Send size={18} />
              </Button>
           </div>
        </footer>
      </div>

      <aside className="hidden lg:block w-80 space-y-4">
         <Card className="p-8 bg-surface-alt border-white/5 rounded-[32px] space-y-8">
            <div className="text-center space-y-4">
               <Avatar src="" fallback="C" className="h-24 w-24 mx-auto border-4 border-accent/20" />
               <h3 className="text-xl font-bold text-text-primary tracking-tight">Interlocutor</h3>
            </div>
            <div className="pt-6 border-t border-white/5">
               <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted flex items-center gap-2 mb-4">
                  <Brain size={14} className="text-accent" /> Mérito Behavioral
               </h4>
               <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-accent w-[85%]" />
               </div>
            </div>
         </Card>
      </aside>
    </div>
  );
}

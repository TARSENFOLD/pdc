import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Input, Button, Spinner, Avatar } from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/lib/auth/AuthContext';
import { http } from '@/lib/api/http';

interface Mensagem {
  id: string;
  conversaId: string;
  remetenteId: string;
  conteudo: string;
  lida: boolean;
  createdAt: string;
}

interface MensagensResponse {
  data: Mensagem[];
  meta?: { pagination?: { total: number } };
}

interface ConversaInfo {
  id: string;
  interlocutorId: string;
  interlocutorNome: string;
  ultimaMensagem?: string;
  naoLidas: number;
  updatedAt: string;
}

interface ConversasResponse {
  data: ConversaInfo[];
  meta?: { pagination?: { total: number } };
}

export function ConversaPage() {
  const { conversaId } = useParams<{ conversaId: string }>();
  const navigate = useNavigate();
  const [novoConteudo, setNovoConteudo] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  // Buscar lista de conversas para obter o nome do interlocutor
  const { data: conversas } = useQuery({
    queryKey: ['mensagens', 'conversas'],
    queryFn: () => http.get<ConversasResponse>('/mensagens/conversas'),
  });

  const conversaActual = (conversas?.data ?? []).find((c) => c.id === conversaId);
  const interlocutorNome = conversaActual?.interlocutorNome ?? 'Chat';

  // Buscar mensagens da conversa
  const { data: mensagens, isLoading: loadingMensagens } = useQuery({
    queryKey: ['mensagens', 'conversa', conversaId],
    queryFn: () => http.get<MensagensResponse>(`/mensagens/conversas/${conversaId}`),
    enabled: !!conversaId,
  });

  // Enviar mensagem
  const enviarMutation = useMutation({
    mutationFn: () => {
      if (!conversaId || !novoConteudo.trim()) {
        throw new Error('Dados invalidos');
      }
      return http.post<{ data: Mensagem }>(
        `/mensagens/conversas/${conversaId}`,
        { conteudo: novoConteudo }
      );
    },
    onSuccess: () => {
      setNovoConteudo('');
      void queryClient.invalidateQueries({ queryKey: ['mensagens'] });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Nao foi possivel enviar a mensagem.' });
    },
  });

  // Scroll para o fim
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens?.data]);

  const handleSend = () => {
    if (novoConteudo.trim()) {
      enviarMutation.mutate();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center gap-3 bg-background">
        <button
          onClick={() => { navigate('/app/mensagens'); }}
          className="text-text-secondary hover:text-text-primary"
        >
          ← Voltar
        </button>
        <Avatar
          fallback={interlocutorNome.substring(0, 2).toUpperCase()}
          size="sm"
        />
        <h1 className="text-lg font-semibold text-text-primary flex-1">
          {interlocutorNome}
        </h1>
      </div>

      {/* Mensagens */}
      {loadingMensagens ? (
        <div className="flex justify-center items-center flex-1">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {(mensagens?.data ?? []).length === 0 ? (
            <div className="text-center text-text-secondary py-12">
              Nenhuma mensagem ainda. Comeca a conversa!
            </div>
          ) : (
            <>
              {(mensagens?.data ?? []).map((msg) => {
                const isOwn = msg.remetenteId === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${
                        isOwn
                          ? 'bg-amber text-white'
                          : 'bg-background-secondary text-text-primary'
                      }`}
                    >
                      <p className="text-sm break-words">{msg.conteudo}</p>
                      <p className={`text-xs mt-1 ${isOwn ? 'text-white/70' : 'text-text-secondary'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString('pt-PT', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      )}

      {/* Input de Mensagem */}
      <div className="p-4 border-t border-border flex gap-2 bg-background">
        <Input
          value={novoConteudo}
          onChange={(e) => { setNovoConteudo(e.target.value); }}
          onKeyDown={handleKeyDown}
          placeholder="Escreve uma mensagem..."
          maxLength={2000}
          className="flex-1"
        />
        <Button
          variant="primary"
          onClick={handleSend}
          disabled={!novoConteudo.trim() || enviarMutation.isPending}
          isLoading={enviarMutation.isPending}
        >
          Enviar
        </Button>
      </div>
    </div>
  );
}

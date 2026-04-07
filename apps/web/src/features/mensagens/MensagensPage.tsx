import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Input, Button, Spinner, Avatar } from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/lib/auth/AuthContext';
import { http } from '@/lib/api/http';

interface Conversa {
  id: string;
  interlocutorId: string;
  interlocutorNome: string;
  ultimaMensagem?: string;
  naoLidas: number;
  updatedAt: string;
}

interface Mensagem {
  id: string;
  conversaId: string;
  remetenteId: string;
  conteudo: string;
  lida: boolean;
  createdAt: string;
}

interface ConversasResponse {
  data: Conversa[];
  meta?: { pagination?: { total: number } };
}

interface MensagensResponse {
  data: Mensagem[];
  meta?: { pagination?: { total: number } };
}

interface VinculoMeu {
  id: string;
  senderPerfil: { id: string; nome: string };
  receiverPerfil: { id: string; nome: string };
}

export function MensagensPage() {
  const [conversaSelecionada, setConversaSelecionada] = useState<string | null>(null);
  const [novoConteudo, setNovoConteudo] = useState('');
  const [mostrarNovaConversa, setMostrarNovaConversa] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Conversas do utilizador
  const { data: conversas, isLoading: loadingConversas } = useQuery({
    queryKey: ['mensagens', 'conversas'],
    queryFn: () => http.get<ConversasResponse>('/mensagens/conversas'),
    refetchInterval: 30000,
  });

  // Mensagens da conversa seleccionada
  const { data: mensagens, isLoading: loadingMensagens } = useQuery({
    queryKey: ['mensagens', 'conversa', conversaSelecionada],
    queryFn: () => http.get<MensagensResponse>(`/mensagens/conversas/${conversaSelecionada}`),
    enabled: !!conversaSelecionada,
  });

  // Vinculos para nova conversa
  const { data: vinculos } = useQuery({
    queryKey: ['vinculos', 'meus'],
    queryFn: () => http.get<{ data: VinculoMeu[] }>('/vinculos/meus?pageSize=50'),
    enabled: mostrarNovaConversa,
  });

  // Criar conversa
  const criarConversaMutation = useMutation({
    mutationFn: (destinatarioId: string) =>
      http.post<{ id: string }>('/mensagens/conversas', { destinatarioId }),
    onSuccess: (data) => {
      setMostrarNovaConversa(false);
      void queryClient.invalidateQueries({ queryKey: ['mensagens', 'conversas'] });
      const novaConversaId = (data as { id: string }).id;
      if (novaConversaId) {
        setConversaSelecionada(novaConversaId);
      }
    },
    onError: (err: Error) => {
      toast({ title: 'Erro', description: err.message || 'Nao foi possivel criar a conversa.' });
    },
  });

  // Enviar mensagem
  const enviarMutation = useMutation({
    mutationFn: () => {
      if (!conversaSelecionada || !novoConteudo.trim()) {
        throw new Error('Dados invalidos');
      }
      return http.post<{ data: Mensagem }>(
        `/mensagens/conversas/${conversaSelecionada}`,
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

  // Scroll para o fim quando ha novas mensagens
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

  // On mobile, clicking a conversation navigates to the dedicated ConversaPage
  const handleConversaClick = (conversaId: string) => {
    if (window.innerWidth < 768) {
      navigate(`/app/mensagens/${conversaId}`);
    } else {
      setConversaSelecionada(conversaId);
    }
  };

  // Filter vinculos to exclude users that already have conversations
  const conversaInterlocutorIds = new Set((conversas?.data ?? []).map((c) => c.interlocutorId));
  const vinculosDisponiveis = (vinculos?.data ?? [])
    .map((v) => {
      const outro = v.senderPerfil.id === user?.id ? v.receiverPerfil : v.senderPerfil;
      return outro;
    })
    .filter((p) => !conversaInterlocutorIds.has(p.id));

  return (
    <div className="flex gap-0 md:gap-6 h-[calc(100vh-200px)]">
      {/* Lista de Conversas */}
      <div className={`w-full md:w-80 border border-border rounded-lg overflow-hidden flex flex-col ${conversaSelecionada ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary">Mensagens</h2>
          <Button
            variant="primary"
            size="sm"
            onClick={() => { setMostrarNovaConversa(!mostrarNovaConversa); }}
          >
            + Nova
          </Button>
        </div>

        {/* Painel de nova conversa */}
        {mostrarNovaConversa && (
          <div className="p-3 border-b border-border bg-background-secondary">
            <p className="text-xs text-text-secondary mb-2">Seleciona um vinculo:</p>
            {vinculosDisponiveis.length === 0 ? (
              <p className="text-xs text-text-secondary">Nenhum vinculo disponivel.</p>
            ) : (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {vinculosDisponiveis.map((perfil) => (
                  <button
                    key={perfil.id}
                    onClick={() => { criarConversaMutation.mutate(perfil.id); }}
                    disabled={criarConversaMutation.isPending}
                    className="w-full flex items-center gap-2 p-2 rounded hover:bg-background text-left transition"
                  >
                    <Avatar fallback={perfil.nome.substring(0, 2).toUpperCase()} size="sm" />
                    <span className="text-sm text-text-primary truncate">{perfil.nome}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {loadingConversas ? (
          <div className="flex justify-center py-8">
            <Spinner size="sm" />
          </div>
        ) : (conversas?.data ?? []).length === 0 ? (
          <div className="p-4 text-center text-text-secondary text-sm">
            Nenhuma conversa ainda.
          </div>
        ) : (
          <div className="overflow-y-auto flex-1">
            {(conversas?.data ?? []).map((conversa) => (
              <button
                key={conversa.id}
                onClick={() => { handleConversaClick(conversa.id); }}
                className={`w-full p-3 border-b border-border text-left hover:bg-background-secondary transition ${
                  conversaSelecionada === conversa.id ? 'bg-background-secondary' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    fallback={conversa.interlocutorNome.substring(0, 2).toUpperCase()}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {conversa.interlocutorNome}
                    </p>
                    <p className="text-xs text-text-secondary truncate">
                      {conversa.ultimaMensagem || 'Sem mensagens'}
                    </p>
                  </div>
                  {conversa.naoLidas > 0 && (
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-error text-text-primary text-xs font-bold">
                      {conversa.naoLidas}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Area de Chat (desktop only) */}
      {conversaSelecionada ? (
        <div className="hidden md:flex flex-1 border border-border rounded-lg overflow-hidden flex-col">
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between bg-background">
            <h3 className="text-lg font-semibold text-text-primary">
              {(conversas?.data ?? []).find((c) => c.id === conversaSelecionada)?.interlocutorNome}
            </h3>
          </div>

          {/* Mensagens */}
          {loadingMensagens ? (
            <div className="flex justify-center items-center flex-1">
              <Spinner size="lg" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                          ? 'bg-amber text-background'
                          : 'bg-background-secondary text-text-primary'
                      }`}
                    >
                      <p className="text-sm break-words">{msg.conteudo}</p>
                      <p className={`text-xs mt-1 ${isOwn ? 'text-background/70' : 'text-text-secondary'}`}>
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
      ) : (
        <div className="hidden md:flex flex-1 border border-border rounded-lg items-center justify-center text-text-secondary">
          Selecciona uma conversa para comecar
        </div>
      )}
    </div>
  );
}

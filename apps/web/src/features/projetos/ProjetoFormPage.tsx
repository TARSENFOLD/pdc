import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projetosApi } from '@/lib/api/projetos';
import { Spinner, Button, Input } from '@/components/ui';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { toast } from '@/hooks/useToast';
import type { ProjetoModo, ProjetoAbstract, ProjetoCore, PedidoAcesso } from '@pdc/shared';

const MODOS: { value: ProjetoModo; label: string; icon: string }[] = [
  { value: 'Exposicao', label: 'Exposição', icon: '🎨' },
  { value: 'Colaboracao', label: 'Colaboração', icon: '🤝' },
  { value: 'Mentoria', label: 'Mentoria', icon: '🎓' },
  { value: 'Financiamento', label: 'Financiamento', icon: '💰' },
  { value: 'FeedbackComunitario', label: 'Feedback Comunitário', icon: '💬' },
];

export default function ProjetoFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = !!id;

  const [titulo, setTitulo] = useState('');
  const [modos, setModos] = useState<ProjetoModo[]>([]);
  const [abstract, setAbstract] = useState<ProjetoAbstract>({});
  const [core, setCore] = useState<ProjetoCore>({});
  const [activeTab, setActiveTab] = useState('pitch');
  const [pendingAction, setPendingAction] = useState<{ pedidoId: string; status: string } | null>(null);

  const { data: projeto, isLoading } = useQuery({
    queryKey: ['projetos', id ?? ''],
    queryFn: () => projetosApi.getById(id ?? ''),
    enabled: isEdit,
  });

  const { data: projectWithPedidos } = useQuery({
    queryKey: ['projetos', id ?? '', 'pedidos'],
    queryFn: () => projetosApi.getById(id ?? ''),
    enabled: isEdit && activeTab === 'pedidos',
  });

  useEffect(() => {
    if (projeto) {
      setTitulo(projeto.titulo);
      setModos((projeto.modos ?? []) as ProjetoModo[]);
      setAbstract(projeto.abstract ?? {});
      setCore(projeto.core ?? {});
    }
  }, [projeto]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        titulo,
        abstract,
        core,
        modos,
      };
      return isEdit
        ? projetosApi.update(id, payload)
        : projetosApi.create(payload);
    },
    onSuccess: (saved) => {
      void qc.invalidateQueries({ queryKey: ['projetos'] });
      navigate(`/projetos/${saved.id}`);
    },
  });

  const respondMutation = useMutation({
    mutationFn: ({ pedidoId, status }: { pedidoId: string; status: 'aprovado' | 'rejeitado' }) =>
      projetosApi.respondPedido(id ?? '', pedidoId, status),
    onSuccess: () => {
      setPendingAction(null);
      void qc.invalidateQueries({ queryKey: ['projetos', id ?? '', 'pedidos'] });
      toast({ title: 'Pedido processado com sucesso' });
    },
    onError: (err: Error) => {
      setPendingAction(null);
      toast({ 
        title: 'Erro ao processar pedido', 
        description: err.message,
        variant: 'error'
      });
    },
  });

  function toggleModo(modo: ProjetoModo) {
    setModos((prev) =>
      prev.includes(modo) ? prev.filter((m) => m !== modo) : [...prev, modo]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  if (isEdit && isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  function hasPedidosAcesso(obj: unknown): obj is { pedidosAcesso: PedidoAcesso[] } {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'pedidosAcesso' in obj &&
      Array.isArray((obj as Record<string, unknown>).pedidosAcesso)
    );
  }

  const pedidos = hasPedidosAcesso(projectWithPedidos) ? projectWithPedidos.pedidosAcesso : [];

  return (
    <div className="max-w-2xl">
      <p className="text-xs font-mono text-amber uppercase tracking-widest mb-1">PROJETO · {isEdit ? 'EDITAR' : 'CRIAR'}</p>
      <h1 className="mb-6 text-2xl font-bold text-text-primary">
        {isEdit ? 'Editar o teu projeto' : 'Vamos contar o teu projeto da forma certa.'}
      </h1>

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-text-secondary">Título do projeto *</label>
          <Input
            value={titulo}
            onChange={(e) => { setTitulo(e.target.value); }}
            required
            minLength={3}
            maxLength={120}
            placeholder="ex: App de Gestão de Resíduos para Luanda"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 w-full justify-start">
            <TabsTrigger value="pitch" className="gap-2">
              🌐 Pitch Público
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-mono text-blue-700">VISÍVEL</span>
            </TabsTrigger>
            <TabsTrigger value="core" className="gap-2">
              🔒 Core Privado
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-mono text-red-700">ACL</span>
            </TabsTrigger>
            {isEdit && (
              <TabsTrigger value="pedidos" className="gap-2">
                📨 Pedidos de Acesso
                {pedidos.filter((p) => p.status === 'pendente').length > 0 && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-mono text-red-700">
                    {pedidos.filter((p) => p.status === 'pendente').length}
                  </span>
                )}
              </TabsTrigger>
            )}
          </TabsList>

          {/* Tab 1: Pitch Público */}
          <TabsContent value="pitch">
            <div className="rounded-lg border border-border bg-surface-raised p-5 space-y-4">
              <p className="rounded-md border-l-4 border-amber bg-surface-recessed px-4 py-2 text-xs text-text-secondary">
                Esta camada é vista por todos. Não inclui código, dados sensíveis ou metodologia detalhada.
              </p>

              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  Que problema resolve? <span className="font-mono text-[10px] text-text-muted">PÚBLICO</span>
                </label>
                <textarea
                  value={abstract.problema ?? ''}
                  onChange={(e) => { setAbstract((a) => ({ ...a, problema: e.target.value })); }}
                  rows={4}
                  className="w-full rounded-md border border-border bg-surface-canvas px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-amber"
                  placeholder="Em Luanda há 7 mil pontos críticos de acumulação..."
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  Impacto esperado <span className="font-mono text-[10px] text-text-muted">OPCIONAL</span>
                </label>
                <textarea
                  value={abstract.impacto ?? ''}
                  onChange={(e) => { setAbstract((a) => ({ ...a, impacto: e.target.value })); }}
                  rows={3}
                  className="w-full rounded-md border border-border bg-surface-canvas px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-amber"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  Modos do projeto <span className="font-mono text-[10px] text-text-muted">ESCOLHE 1 OU MAIS</span>
                </label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {MODOS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => { toggleModo(m.value); }}
                      className={`flex min-h-11 items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                        modos.includes(m.value)
                          ? 'border-amber bg-amber/10 text-amber'
                          : 'border-border bg-surface-canvas text-text-secondary hover:border-amber/50'
                      }`}
                    >
                      <span>{m.icon}</span> {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => { navigate(-1); }}>
                  Cancelar
                </Button>
                <Button type="submit" isLoading={mutation.isPending}>
                  {isEdit ? 'Guardar alterações' : 'Criar Projeto'}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Tab 2: Core Privado */}
          <TabsContent value="core">
            <div className="rounded-lg border border-border bg-surface-raised p-5 space-y-4">
              <p className="rounded-md border-l-4 border-red-400 bg-surface-recessed px-4 py-2 text-xs text-text-secondary">
                🔒 Esta camada é encriptada e só acessível a colaboradores e a quem tiver pedido aprovado.
              </p>

              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">Metodologia</label>
                <textarea
                  value={core.metodologia ?? ''}
                  onChange={(e) => { setCore((c) => ({ ...c, metodologia: e.target.value })); }}
                  rows={5}
                  className="w-full rounded-md border border-border bg-surface-canvas px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-amber"
                  placeholder="Descreve a metodologia técnica do projeto..."
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">Repositório / Código Fonte</label>
                <Input
                  value={core.codigoFonte ?? ''}
                  onChange={(e) => { setCore((c) => ({ ...c, codigoFonte: e.target.value })); }}
                  placeholder="https://github.com/…"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">Planos Técnicos</label>
                <textarea
                  value={core.planosTecnicos ?? ''}
                  onChange={(e) => { setCore((c) => ({ ...c, planosTecnicos: e.target.value })); }}
                  rows={4}
                  className="w-full rounded-md border border-border bg-surface-canvas px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-amber"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">Dados Sensíveis / Notas Internas</label>
                <textarea
                  value={core.dadosSensiveis ?? ''}
                  onChange={(e) => { setCore((c) => ({ ...c, dadosSensiveis: e.target.value })); }}
                  rows={3}
                  className="w-full rounded-md border border-border bg-surface-canvas px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-amber"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => { navigate(-1); }}>
                  Cancelar
                </Button>
                <Button type="submit" isLoading={mutation.isPending}>
                  {isEdit ? 'Guardar Core' : 'Criar Projeto'}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Tab 3: Pedidos de Acesso */}
          {isEdit && (
            <TabsContent value="pedidos">
              <div className="rounded-lg border border-border bg-surface-raised p-5 space-y-3">
                <p className="text-sm text-text-secondary">
                  Pedidos de acesso ao Core Privado do teu projeto.
                </p>

                {pedidos.length === 0 ? (
                  <p className="py-6 text-center text-sm text-text-muted">Sem pedidos de acesso ainda.</p>
                ) : (
                  pedidos.map((pedido) => (
                    <div
                      key={pedido.id}
                      className="flex items-start justify-between rounded-md border border-border p-3"
                    >
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-text-primary">
                          {pedido.perfilSolicitante?.nome ?? 'Utilizador desconhecido'}
                        </p>
                        {pedido.motivo && (
                          <p className="text-xs text-text-secondary">{pedido.motivo}</p>
                        )}
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-mono ${
                            pedido.status === 'aprovado'
                              ? 'bg-green-100 text-green-700'
                              : pedido.status === 'rejeitado'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {pedido.status.toUpperCase()}
                        </span>
                      </div>

                      {pedido.status === 'pendente' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            isLoading={pendingAction?.pedidoId === pedido.id && pendingAction?.status === 'aprovado'}
                            onClick={() => {
                              setPendingAction({ pedidoId: pedido.id, status: 'aprovado' });
                              respondMutation.mutate({ pedidoId: pedido.id, status: 'aprovado' });
                            }}
                          >
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            isLoading={pendingAction?.pedidoId === pedido.id && pendingAction?.status === 'rejeitado'}
                            onClick={() => {
                              setPendingAction({ pedidoId: pedido.id, status: 'rejeitado' });
                              respondMutation.mutate({ pedidoId: pedido.id, status: 'rejeitado' });
                            }}
                          >
                            Rejeitar
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </form>
    </div>
  );
}

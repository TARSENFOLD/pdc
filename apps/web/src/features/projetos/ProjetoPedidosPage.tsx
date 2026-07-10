import { Navigate, Link, useParams } from 'react-router-dom';
import { useMutation, useMutationState, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { projetosApi } from '@/lib/api/projetos';
import { useAuth } from '@/lib/auth/auth-context';
import { toast } from '@/hooks/useToast';
import { Button, Spinner } from '@/components/ui';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProjetoAccessList } from './components/ProjetoAccessList';

export function ProjetoPedidosPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const projectQuery = useQuery({
    queryKey: ['projetos', id ?? ''],
    queryFn: () => projetosApi.getById(id ?? ''),
    enabled: !!id,
  });
  const pedidosQuery = useQuery({
    queryKey: ['projetos', id ?? '', 'pedidos-acesso'],
    queryFn: () => projetosApi.listAccessRequests(id ?? ''),
    enabled: !!id,
  });
  const project = projectQuery.data?.data[0];
  const isOwner = !!project && !!user?.perfilId && project.autor?.id === user.perfilId;

  const decision = useMutation({
    mutationKey: ['projetos', id, 'pedidos-acesso', 'decision'],
    mutationFn: ({ pedidoId, status }: { pedidoId: string; status: 'aprovado' | 'rejeitado' }) =>
      projetosApi.respondAccessRequest(id ?? '', pedidoId, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projetos', id] });
      void queryClient.invalidateQueries({ queryKey: ['projetos', id, 'pedidos-acesso'] });
      toast({ title: 'Acesso ao núcleo atualizado' });
    },
    onError: () => { toast({ title: 'Não foi possível atualizar o acesso', variant: 'error' }); },
  });

  const decidingIds = useMutationState({
    filters: {
      mutationKey: ['projetos', id, 'pedidos-acesso', 'decision'],
      status: 'pending',
    },
    select: (mutation) => (mutation.state.variables as { pedidoId?: string } | undefined)?.pedidoId,
  });

  const isDeciding = (pedidoId: string) => decidingIds.includes(pedidoId);

  if (!id) return <Navigate to="/app/projetos" replace />;
  if (projectQuery.isLoading || pedidosQuery.isLoading) return <div className="flex min-h-[60vh] items-center justify-center"><Spinner size="lg" /></div>;
  if (!project || projectQuery.isError || pedidosQuery.isError) {
    return <EmptyState icon={ShieldCheck} variant="error" title="Projeto indisponível" description="Não foi possível carregar os pedidos deste projeto." />;
  }
  if (!isOwner) return <Navigate to={`/app/projetos/${id}`} replace />;

  const entries = pedidosQuery.data?.data ?? [];
  const pendingCount = entries.filter((entry) => entry.status === 'pendente').length;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link to={`/app/projetos/${id}`} className="inline-flex items-center gap-2 text-sm text-ink-secondary hover:text-ink-primary">
        <ArrowLeft size={16} /> Voltar ao projeto
      </Link>
      <header className="mt-8 border-b border-border pb-6">
        <p className="text-xs font-semibold uppercase text-accent">Núcleo privado</p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-ink-primary">Pedidos de acesso</h1>
            <p className="mt-2 max-w-2xl text-sm text-ink-secondary">
              Decide quem pode consultar a metodologia, os dados e os materiais protegidos de {project.titulo}.
            </p>
          </div>
          <span className="text-sm text-ink-tertiary">{pendingCount} pendente{pendingCount === 1 ? '' : 's'}</span>
        </div>
      </header>
      <section className="py-6" aria-label="Pedidos de acesso ao núcleo">
        <ProjetoAccessList
          entries={entries}
          pendingPedidoId={decision.isPending ? decision.variables?.pedidoId : undefined}
          isDeciding={isDeciding}
          onDecision={(pedidoId, status) => { decision.mutate({ pedidoId, status }); }}
        />
      </section>
      <div className="border-t border-border pt-5">
        <Link to={`/app/projetos/${id}/colaboracao`}>
          <Button variant="outline">Abrir espaço de colaboração</Button>
        </Link>
      </div>
    </main>
  );
}

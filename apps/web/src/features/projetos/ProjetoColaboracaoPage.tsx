import { Navigate, Link, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ExternalLink, GitBranch, LockKeyhole, MessageSquare, Users } from 'lucide-react';
import { projetosApi } from '@/lib/api/projetos';
import { useAuth } from '@/lib/auth/auth-context';
import { toast } from '@/hooks/useToast';
import { Button, Spinner } from '@/components/ui';
import { EmptyState } from '@/components/ui/EmptyState';

export function ProjetoColaboracaoPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const projectQuery = useQuery({
    queryKey: ['projetos', id ?? ''],
    queryFn: () => projetosApi.getById(id ?? ''),
    enabled: !!id,
  });
  const project = projectQuery.data?.data[0];
  const isOwner = !!project && !!user?.perfilId && project.autor?.id === user.perfilId;
  const approved = project?.acessoCoreACL?.filter((entry) => entry.estado === 'aprovado') ?? [];
  const canCollaborate = isOwner || !!project?.core;

  const requestAccess = useMutation({
    mutationFn: () => projetosApi.requestAccess(id ?? ''),
    onSuccess: () => { toast({ title: 'Pedido enviado ao autor' }); },
    onError: () => { toast({ title: 'Não foi possível enviar o pedido', variant: 'error' }); },
  });

  if (!id) return <Navigate to="/app/projetos" replace />;
  if (projectQuery.isLoading) return <div className="flex min-h-[60vh] items-center justify-center"><Spinner size="lg" /></div>;
  if (!project || projectQuery.isError) {
    return <EmptyState icon={Users} variant="error" title="Projeto indisponível" description="Não foi possível abrir o espaço de colaboração." />;
  }
  if (!project.modos.includes('colaboracao')) return <Navigate to={`/app/projetos/${id}`} replace />;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="border-b border-border pb-7">
        <p className="text-xs font-semibold uppercase text-accent">Espaço de colaboração</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink-primary">{project.titulo}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-secondary">
          Coordena contribuições sem expor o núcleo técnico a pessoas que ainda não foram aprovadas.
        </p>
      </header>

      {!canCollaborate ? (
        <section className="my-8 border-y border-border py-10 text-center">
          <LockKeyhole className="mx-auto text-accent" size={28} />
          <h2 className="mt-4 text-lg font-semibold text-ink-primary">Acesso necessário</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-ink-secondary">O autor precisa aprovar o teu acesso antes de mostrar o núcleo e os recursos de trabalho.</p>
          <Button className="mt-5" isLoading={requestAccess.isPending} onClick={() => { requestAccess.mutate(); }}>
            Pedir acesso
          </Button>
        </section>
      ) : (
        <div className="grid gap-8 py-8 lg:grid-cols-[1fr_320px]">
          <section className="space-y-7">
            <div>
              <h2 className="text-base font-semibold text-ink-primary">Núcleo técnico</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-ink-secondary">{project.core ?? 'O autor ainda não adicionou documentação técnica.'}</p>
            </div>
            <div className="flex flex-wrap gap-3 border-t border-border pt-5">
              {project.repoUrl && (
                <a href={project.repoUrl} target="_blank" rel="noreferrer">
                  <Button variant="outline"><GitBranch size={15} /> Abrir repositório</Button>
                </a>
              )}
              {project.demoUrl && (
                <a href={project.demoUrl} target="_blank" rel="noreferrer">
                  <Button variant="outline"><ExternalLink size={15} /> Abrir demonstração</Button>
                </a>
              )}
              <Link to="/app/mensagens">
                <Button variant="outline"><MessageSquare size={15} /> Mensagens</Button>
              </Link>
            </div>
          </section>
          <aside className="border-l border-border pl-0 lg:pl-6">
            <h2 className="text-sm font-semibold text-ink-primary">Colaboradores com acesso</h2>
            <div className="mt-4 space-y-3">
              {approved.length === 0 ? (
                <p className="text-sm text-ink-tertiary">Nenhum colaborador aprovado.</p>
              ) : approved.map((entry) => (
                <div key={entry.perfilId} className="border-b border-border pb-3">
                  <p className="text-sm font-medium text-ink-primary">Perfil {entry.perfilId}</p>
                  <p className="text-xs text-ink-tertiary">Acesso ao núcleo ativo</p>
                </div>
              ))}
            </div>
            {isOwner && (
              <Link to={`/app/projetos/${id}/pedidos`} className="mt-6 block">
                <Button variant="outline" className="w-full">Gerir pedidos</Button>
              </Link>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}

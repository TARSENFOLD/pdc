import { useParams, Navigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projetosApi } from '@/lib/api/projetos';
import { useAuth } from '@/lib/auth/AuthContext';
import { Spinner, Badge, Button } from '@/components/ui';
import { DenunciarButton } from '@/components/ui/DenunciarButton';

export function ProjetoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: projeto, isLoading, isError } = useQuery({
    queryKey: ['projetos', id ?? ''],
    queryFn: () => projetosApi.getById(id ?? ''),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => projetosApi.remove(id ?? ''),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['projetos'] });
    },
  });

  if (!id) return <Navigate to="/projetos" replace />;

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !projeto) {
    return <p className="py-12 text-center text-error">Erro ao carregar o projeto.</p>;
  }

  const isOwner = user?.id === projeto.alunoId;
  const canDelete = isOwner || user?.role === 'moderador' || user?.role === 'super_admin';

  return (
    <div className="max-w-3xl">
      {projeto.imagemUrl ? (
        <img src={projeto.imagemUrl} alt={projeto.titulo} className="mb-6 h-48 w-full rounded-xl object-cover" />
      ) : null}

      <div className="mb-4 flex items-start justify-between gap-4">
        <h1 className="text-2xl font-bold text-text-primary">{projeto.titulo}</h1>
        <div className="flex shrink-0 items-center gap-2">
          {!isOwner && <DenunciarButton conteudoId={projeto.id} conteudoTipo="projeto" />}
          {isOwner && (
            <>
              <Link
                to={`/app/projetos/${id}/editar`}
                className="inline-flex h-8 items-center rounded-md bg-surface-raised px-3 text-xs font-semibold text-text-primary hover:bg-white/10 border border-border"
              >
                Editar
              </Link>
              {canDelete && (
                <Button
                  variant="danger"
                  size="sm"
                  isLoading={deleteMutation.isPending}
                  onClick={() => {
                    if (confirm('Eliminar projeto?')) deleteMutation.mutate();
                  }}
                >
                  Eliminar
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {projeto.tags && projeto.tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {projeto.tags.map((tag) => (
            <Badge key={tag} variant="outline">{tag}</Badge>
          ))}
        </div>
      )}

      <p className="mb-6 leading-relaxed text-text-secondary">{projeto.descricao}</p>

      <div className="flex flex-wrap gap-3">
        {projeto.repoUrl && (
          <a
            href={projeto.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center rounded-md border border-border bg-surface-raised px-4 text-sm text-text-primary hover:bg-white/10"
          >
            Repositório
          </a>
        )}
        {projeto.demoUrl && (
          <a
            href={projeto.demoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center rounded-md bg-amber px-4 text-sm font-semibold text-background hover:bg-amber-hover"
          >
            Demo
          </a>
        )}
      </div>
      
      {/* Integrate DenunciarButton here */}
      <div className="mt-8 flex justify-end">
        <DenunciarButton conteudoId={projeto.id} conteudoTipo="projeto" />
      </div>
    </div>
  );
}

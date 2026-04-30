import { useParams, Navigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projetosApi } from '@/lib/api/projetos';
import { likeApi, bookmarkApi, ratingsApi } from '@/lib/api/interactions';
import { useAuth } from '@/lib/auth/AuthContext';
import { EmptyState } from '@/components/ui/EmptyState';
import { Search } from 'lucide-react';

import { Spinner, Badge, Button, LikeButton, BookmarkButton, RatingStars } from '@/components/ui';
import { EditorialStateBadge } from '@/components/ui/EditorialStateBadge';
import { DenunciarButton } from '@/components/ui/DenunciarButton';
import { SEOHead } from '@/components/layout/SEOHead';

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

  const { data: likeStatus } = useQuery({
    queryKey: ['projeto', id, 'likes'],
    queryFn: () => likeApi.getStatus('projeto', id ?? ''),
    enabled: !!id,
  });

  const { data: ratingStats } = useQuery({
    queryKey: ['projeto', id, 'ratings'],
    queryFn: () => ratingsApi.getStats('projeto', id ?? ''),
    enabled: !!id,
  });

  const { data: bookmarks } = useQuery({
    queryKey: ['bookmarks'],
    queryFn: () => bookmarkApi.list(),
  });
  const isBookmarked = bookmarks?.data.some(b => b.targetType === 'projeto' && b.targetId === id) ?? false;


  if (!id) return <Navigate to="/projetos" replace />;

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !projeto) {
    return <div className="flex min-h-screen items-center justify-center bg-canvas p-4"><EmptyState icon={Search} variant="error" title="Erro ao carregar o projeto" description="Não foi possível carregar os dados deste projeto." /></div>;
  }

  const isOwner = user?.id === projeto.estudanteId;
  const canDelete = isOwner || user?.role === 'moderador' || user?.role === 'super_admin';

  return (
    <div className="max-w-3xl">
      <SEOHead
        title={projeto.titulo}
        description={projeto.descricao || projeto.abstract || projeto.titulo}
        url={`https://usepdc.com/projetos/${id}`}
        type="article"
      />
      {projeto.capaUrl ? (
        <img src={projeto.capaUrl} alt={projeto.titulo} className="mb-6 h-48 w-full rounded-xl object-cover" />
      ) : null}

      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2">
            <EditorialStateBadge state={projeto.estado} />
          </div>
          <h1 className="text-4xl font-bold text-ink-primary font-display">{projeto.titulo}</h1>
          <div className="flex items-center gap-2">
            <RatingStars targetType="projeto" targetId={id} stats={ratingStats} />
            <div className="w-px h-6 bg-border mx-2"></div>
            <LikeButton targetType="projeto" targetId={id} initialCount={likeStatus?.count} initialLiked={likeStatus?.liked} />
            <BookmarkButton targetType="projeto" targetId={id} initialBookmarked={isBookmarked} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!isOwner && <DenunciarButton conteudoId={projeto.id} conteudoTipo="projeto" />}
          {isOwner && (
            <>
              <Link
                to={`/app/projetos/${id}/editar`}
                className="inline-flex h-8 items-center rounded-md bg-elevated px-3 text-xs font-semibold text-ink-primary hover:bg-elevated border border-ink-tertiary/10"
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

      {projeto.tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {projeto.tags.map((tag) => (
            <Badge key={tag} variant="outline">{tag}</Badge>
          ))}
        </div>
      )}

      <p className="mb-6 leading-relaxed text-ink-secondary">{projeto.descricao}</p>

      <div className="flex flex-wrap gap-3">
        {projeto.repoUrl && (
          <a
            href={projeto.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center rounded-md border border-ink-tertiary/10 bg-elevated px-4 text-sm text-ink-primary hover:bg-elevated"
          >
            Repositório
          </a>
        )}
        {projeto.demoUrl && (
          <a
            href={projeto.demoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm font-semibold text-background hover:bg-accent-terracotta-soft"
          >
            Demo
          </a>
        )}
      </div>
    </div>
  );
}

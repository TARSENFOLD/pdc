import { useParams, Navigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { experienciasApi } from '@/lib/api/experiencias';
import { likeApi, bookmarkApi, ratingsApi } from '@/lib/api/interactions';
import { Spinner, Badge, LikeButton, BookmarkButton, RatingStars } from '@/components/ui';

export function ExperienciaDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: exp, isLoading, isError } = useQuery({
    queryKey: ['experiencias', id ?? ''],
    queryFn: () => experienciasApi.getById(id ?? ''),
    enabled: !!id,
  });

  const { data: likeStatus } = useQuery({
    queryKey: ['experiencia', id, 'likes'],
    queryFn: () => likeApi.getStatus('experiencia', id ?? ''),
    enabled: !!id,
  });

  const { data: ratingStats } = useQuery({
    queryKey: ['experiencia', id, 'ratings'],
    queryFn: () => ratingsApi.getStats('experiencia', id ?? ''),
    enabled: !!id,
  });

  const { data: bookmarks } = useQuery({
    queryKey: ['bookmarks'],
    queryFn: () => bookmarkApi.list(),
  });
  const isBookmarked = bookmarks?.data.some(b => b.targetType === 'experiencia' && b.targetId === id) ?? false;


  if (!id) return <Navigate to="/experiencias" replace />;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !exp) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <p className="text-error">Experiência não encontrada.</p>
        <Link to="/experiencias" className="text-sm text-amber hover:underline">
          ← Voltar
        </Link>
      </div>
    );
  }

  const inicio = new Date(exp.dataInicio).toLocaleDateString('pt-AO', { dateStyle: 'long' });
  const fim = exp.dataFim
    ? new Date(exp.dataFim).toLocaleDateString('pt-AO', { dateStyle: 'long' })
    : null;

  return (
    <div className="min-h-screen bg-background px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link to="/experiencias" className="mb-6 inline-flex text-sm text-amber hover:underline">
          ← Todas as experiências
        </Link>

        {exp.capaUrl ? (
          <img
            src={exp.capaUrl}
            alt={exp.titulo}
            className="mb-8 mt-4 h-64 w-full rounded-2xl object-cover"
          />
        ) : (
          <div className="mb-8 mt-4 h-64 w-full rounded-2xl bg-surface-raised" />
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
          <h1 className="text-3xl font-bold text-text-primary">{exp.titulo}</h1>
          <div className="flex items-center gap-2 shrink-0">
            <RatingStars targetType="experiencia" targetId={id} stats={ratingStats} />
            <div className="w-px h-6 bg-border mx-2"></div>
            <LikeButton targetType="experiencia" targetId={id} initialCount={likeStatus?.count} initialLiked={likeStatus?.liked} />
            <BookmarkButton targetType="experiencia" targetId={id} initialBookmarked={isBookmarked} />
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <Badge variant="info">Início: {inicio}</Badge>
          {fim ? (
            <Badge variant="outline">Fim: {fim}</Badge>
          ) : (
            <Badge variant="success">Em aberto</Badge>
          )}
        </div>

        <p className="mb-10 leading-relaxed text-text-secondary">{exp.descricao}</p>

        <div className="rounded-2xl border border-amber/20 bg-amber/5 p-6">
          <div className="mb-4">
            <p className="font-semibold text-text-primary">Interessado(a)?</p>
            <p className="mt-1 text-sm text-text-muted">
              Cria uma conta ou inicia sessão para te candidatares a esta experiência.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/register"
              className="inline-flex h-10 items-center rounded-md bg-amber px-5 text-sm font-semibold text-background hover:bg-amber-hover"
            >
              Candidatar-se
            </Link>
            <Link
              to="/login"
              className="inline-flex h-10 items-center rounded-md border border-border px-5 text-sm text-text-primary hover:bg-surface-raised"
            >
              Entrar
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

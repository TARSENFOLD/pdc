import { useEffect } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Button, Spinner, Badge, LikeButton, BookmarkButton, RatingStars } from '@/components/ui';
import { cursosApi } from '@/lib/api/cursos';
import { likeApi, bookmarkApi, ratingsApi } from '@/lib/api/interactions';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { DiscussionsPanel } from '@/features/discussions/DiscussionsPanel';
import { useAuth } from '@/lib/auth/AuthContext';
import { useTelemetry } from '@/hooks/useTelemetry';
import type { ProgressoItem } from '@pdc/shared';

export function CursoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const flags = useFeatureFlags();
  const { user } = useAuth();
  const { track } = useTelemetry();
  const discussionsEnabled = !!flags['DISCUSSIONS_ENABLED'];
  const isMentorOrAdmin = user?.role === 'super_admin' || user?.role === 'mentor';

  useEffect(() => {
    if (id) track('curso.detail_viewed', { cursoId: id });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: curso, isLoading, isError } = useQuery({
    queryKey: ['cursos', id ?? ''],
    queryFn: () => cursosApi.getById(id ?? ''),
    enabled: !!id,
  });

  const { data: progresso = [] } = useQuery<ProgressoItem[]>({
    queryKey: ['cursos', id ?? '', 'progresso'],
    queryFn: () => cursosApi.getProgresso(id ?? ''),
    enabled: !!id,
    retry: false,
  });

  const inscricaoMutation = useMutation({
    mutationFn: () => cursosApi.inscrever(id ?? ''),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['cursos', id ?? '', 'progresso'] });
    },
  });

  const { data: likeStatus } = useQuery({
    queryKey: ['curso', id, 'likes'],
    queryFn: () => likeApi.getStatus('curso', id ?? ''),
    enabled: !!id,
  });

  const { data: ratingStats } = useQuery({
    queryKey: ['curso', id, 'ratings'],
    queryFn: () => ratingsApi.getStats('curso', id ?? ''),
    enabled: !!id,
  });

  const { data: bookmarks } = useQuery({
    queryKey: ['bookmarks'],
    queryFn: () => bookmarkApi.list(),
  });
  const isBookmarked = bookmarks?.data.some(b => b.targetType === 'curso' && b.targetId === id) ?? false;


  if (!id) return <Navigate to="/app/cursos" replace />;

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }
  if (isError || !curso) {
    return <p className="py-12 text-center text-error">Erro ao carregar o curso.</p>;
  }

  const isEnrolled = progresso.length > 0;
  const progressoMap = new Map<string, ProgressoItem>(progresso.map((p) => [p.itemId, p]));
  const allItens = curso.modulos?.flatMap((m) => m.itens) ?? [];
  const concluded = progresso.filter((p) => p.concluido).length;
  const pct = allItens.length > 0 ? Math.round((concluded / allItens.length) * 100) : 0;

  return (
    <div className="max-w-3xl">
      {curso.capaUrl ? (
        <img src={curso.capaUrl} alt={curso.titulo} className="mb-6 h-48 w-full rounded-xl object-cover" />
      ) : null}
      <h1 className="mb-2 text-2xl font-bold text-text-primary">{curso.titulo}</h1>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Badge variant="warning">{curso.totalHoras}h</Badge>
        {isEnrolled && <Badge variant="success">{pct}% concluído</Badge>}
        <Button
          size="sm"
          variant={isEnrolled ? 'secondary' : 'primary'}
          isLoading={inscricaoMutation.isPending}
          disabled={isEnrolled}
          onClick={() => {
            if (!isEnrolled) {
              inscricaoMutation.mutate();
            }
          }}
        >
          {isEnrolled ? 'Inscrito' : 'Inscrever-se'}
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <RatingStars targetType="curso" targetId={id} stats={ratingStats} />
          <div className="w-px h-6 bg-border mx-2"></div>
          <LikeButton targetType="curso" targetId={id} initialCount={likeStatus?.count} initialLiked={likeStatus?.liked} />
          <BookmarkButton targetType="curso" targetId={id} initialBookmarked={isBookmarked} />
        </div>
      </div>


      <Tabs defaultValue="visao">
        <TabsList>
          <TabsTrigger value="visao">Visão Geral</TabsTrigger>
          <TabsTrigger value="progresso">Progresso</TabsTrigger>
          {discussionsEnabled && <TabsTrigger value="discussoes">Discussões</TabsTrigger>}
        </TabsList>

        <TabsContent value="visao">
          <p className="mt-4 leading-relaxed text-text-secondary">{curso.descricao}</p>
          {curso.modulos?.map((modulo) => (
            <div key={modulo.id} className="mt-6">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
                {modulo.titulo}
              </h2>
              <ul className="space-y-2">
                {modulo.itens.map((item) => (
                  <li key={item.id}>
                    <Link
                      to={`/app/cursos/${id}/itens/${item.id}`}
                      className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-surface-raised transition-colors"
                    >
                      <span className="text-sm text-text-primary">{item.titulo}</span>
                      <Badge variant="outline" className="ml-auto">{item.tipo}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="progresso">
          {!isEnrolled ? (
            <p className="py-8 text-center text-text-muted">
              Inscreve-te para acompanhar o teu progresso.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {allItens.map((item) => {
                const p = progressoMap.get(item.id);
                return (
                  <div key={item.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <span className={p?.concluido ? 'text-success' : 'text-text-muted'}>
                      {p?.concluido ? '✓' : '○'}
                    </span>
                    <span className="text-sm text-text-primary">{item.titulo}</span>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {discussionsEnabled && (
          <TabsContent value="discussoes">
            <DiscussionsPanel cursoId={id} isMentorOrAdmin={isMentorOrAdmin} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

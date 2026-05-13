import { useParams, Navigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projetosApi } from '@/lib/api/projetos';
import { likeApi, bookmarkApi, ratingsApi } from '@/lib/api/interactions';
import { useAuth } from '@/lib/auth/auth-context';
import { EmptyState } from '@/components/ui/EmptyState';
import { QuietCard } from '@/components/ui/quiet/QuietCard';
import { EditorialStateBadge } from '@/components/ui/EditorialStateBadge';
import { DenunciarButton } from '@/components/ui/DenunciarButton';
import { SEOHead } from '@/components/layout/SEOHead';
import { Spinner, Badge, Button, Avatar, LikeButton, BookmarkButton, RatingStars } from '@/components/ui';
import {
  ThumbsUp, Star, ChevronRight, Layers,
  Users, GraduationCap, Banknote, MessageCircle, ExternalLink, GitBranch,
} from 'lucide-react';
import type { ProjetoModo } from '@pdc/shared';

const MODO_CTA: Record<ProjetoModo, { label: string; icon: typeof Users }> = {
  exposicao: { label: 'Guardar Projeto', icon: Layers },
  colaboracao: { label: 'Pedir para Colaborar', icon: Users },
  mentoria: { label: 'Oferecer Mentoria', icon: GraduationCap },
  financiamento: { label: 'Manifestar Interesse', icon: Banknote },
  feedbackComunitario: { label: 'Dar Feedback', icon: MessageCircle },
};

const MODO_LABELS: Record<ProjetoModo, string> = {
  exposicao: 'Exposição',
  colaboracao: 'Colaboração',
  mentoria: 'Mentoria',
  financiamento: 'Financiamento',
  feedbackComunitario: 'Feedback Comunitário',
};

export function ProjetoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: raw, isLoading, isError } = useQuery({
    queryKey: ['projetos', id ?? ''],
    queryFn: () => projetosApi.getById(id ?? ''),
    enabled: !!id,
  });
  const projeto = Array.isArray(raw?.data) ? raw.data[0] : raw?.data;

  const deleteMutation = useMutation({
    mutationFn: () => projetosApi.remove(id ?? ''),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['projetos'] }); },
  });

  const { data: votesData } = useQuery({
    queryKey: ['projeto', id, 'votos'],
    queryFn: () => projetosApi.getVotes(id ?? ''),
    enabled: !!id,
  });

  const voteMutation = useMutation({
    mutationFn: ({ tipo, active }: { tipo: 'endorsement' | 'voto'; active: boolean }) =>
      active ? projetosApi.unvote(id ?? '', tipo) : projetosApi.vote(id ?? '', tipo),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['projeto', id, 'votos'] }); },
  });

  const accessRequestMutation = useMutation({
    mutationFn: () => projetosApi.requestAccess(id ?? ''),
    onSuccess: () => {
      toast({ title: 'Pedido de acesso enviado' });
      void qc.invalidateQueries({ queryKey: ['projetos', id] });
    },
    onError: () => toast({ title: 'Erro ao enviar pedido de acesso', variant: 'error' }),
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

  if (!id) return <Navigate to="/app/projetos" replace />;

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !projeto) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
        <EmptyState icon={Layers} variant="error" title="Erro ao carregar o projeto" description="Não foi possível carregar os dados deste projeto." />
      </div>
    );
  }

  const isOwner = !!(user?.perfilId && user.perfilId === projeto.autor?.id);
  const canDelete = isOwner || user?.role === 'moderador' || user?.role === 'super_admin';

  return (
    <div className="min-h-screen bg-canvas px-4 py-8 sm:px-6 lg:px-8">
      <SEOHead
        title={projeto.titulo}
        description={projeto.abstract || projeto.titulo}
        url={`https://usepdc.com/projetos/${id}`}
        type="article"
      />

      <div className="mx-auto max-w-4xl space-y-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-ink-tertiary">
          <Link to="/app" className="hover:text-accent transition-colors">Início</Link>
          <ChevronRight size={12} />
          <Link to="/app/projetos" className="hover:text-accent transition-colors">Projetos</Link>
          <ChevronRight size={12} />
          <span className="text-ink-primary">{projeto.titulo}</span>
        </nav>

        {/* Hero */}
        {projeto.capaUrl && (
          <div className="aspect-[21/9] w-full overflow-hidden rounded-sm">
            <img src={projeto.capaUrl} alt={projeto.titulo} className="w-full h-full object-cover" />
          </div>
        )}

        <header className="space-y-4">
          <div className="flex items-center gap-3">
            <EditorialStateBadge state={projeto.estado} />
            {projeto.area && (
              <span className="px-2 py-0.5 text-[10px] font-semibold text-accent bg-accent/10 rounded-sm">{projeto.area}</span>
            )}
            {projeto.selo && (
              <span className="px-2 py-0.5 text-[10px] font-semibold text-success bg-success/10 rounded-sm">{projeto.selo}</span>
            )}
          </div>

          <h1 className="text-2xl font-bold text-ink-primary">{projeto.titulo}</h1>

          {/* Author */}
          <div className="flex items-center gap-3">
            <Avatar src={projeto.autor?.foto?.url ?? undefined} fallback={projeto.autor?.nome[0] ?? 'P'} className="h-8 w-8" />
            <span className="text-sm font-semibold text-ink-primary">{projeto.autor?.nome ?? 'Autor'}</span>
          </div>

          {/* Mode chips */}
          <div className="flex flex-wrap gap-2">
            {projeto.modos.map((m) => (
              <span key={m} className="px-2.5 py-1 text-xs font-semibold text-ink-secondary bg-elevated border border-border rounded-sm">
                {MODO_LABELS[m]}
              </span>
            ))}
          </div>
        </header>

        {/* Interactions bar */}
        <div className="flex items-center gap-2 py-3 border-y border-border">
          <RatingStars targetType="projeto" targetId={id} stats={ratingStats} />
          <div className="w-px h-5 bg-border" />
          <LikeButton targetType="projeto" targetId={id} initialCount={likeStatus?.count} initialLiked={likeStatus?.liked} />
          <BookmarkButton targetType="projeto" targetId={id} initialBookmarked={isBookmarked} />
          {user && !isOwner && (
            <>
              <div className="w-px h-5 bg-border" />
              <button
                type="button"
                aria-label={votesData?.endorsed ? 'Retirar endorsement' : 'Endorsar projeto'}
                aria-pressed={votesData?.endorsed ?? false}
                disabled={voteMutation.isPending}
                onClick={() => { voteMutation.mutate({ tipo: 'endorsement', active: votesData?.endorsed ?? false }); }}
                className={`inline-flex items-center gap-1 rounded-sm px-2 py-1 text-xs font-medium transition-colors ${
                  votesData?.endorsed ? 'bg-accent/10 text-accent' : 'text-ink-tertiary hover:text-ink-secondary hover:bg-elevated'
                }`}
              >
                <Star className="h-4 w-4" />
                <span>{votesData?.endorsements ?? 0}</span>
              </button>
              <button
                type="button"
                aria-label={votesData?.voted ? 'Retirar voto' : 'Votar no projeto'}
                aria-pressed={votesData?.voted ?? false}
                disabled={voteMutation.isPending}
                onClick={() => { voteMutation.mutate({ tipo: 'voto', active: votesData?.voted ?? false }); }}
                className={`inline-flex items-center gap-1 rounded-sm px-2 py-1 text-xs font-medium transition-colors ${
                  votesData?.voted ? 'bg-accent/10 text-accent' : 'text-ink-tertiary hover:text-ink-secondary hover:bg-elevated'
                }`}
              >
                <ThumbsUp className="h-4 w-4" />
                <span>{votesData?.votos_count ?? 0}</span>
              </button>
            </>
          )}
          <div className="ml-auto flex items-center gap-2">
            {!isOwner && <DenunciarButton conteudoId={projeto.id} conteudoTipo="projeto" />}
          </div>
        </div>

        {/* Abstract */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-ink-primary">Sobre o Projeto</h2>
          <p className="text-sm text-ink-secondary leading-relaxed">{projeto.abstract}</p>
          {projeto.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {projeto.tags.map((tag) => (
                <Badge key={tag} variant="outline">{tag}</Badge>
              ))}
            </div>
          )}
        </section>

        {/* Core (private content) - only shown to author and approved ACL members */}
        {projeto.core && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Lock size={16} className="text-accent" />
              <h2 className="text-base font-semibold text-ink-primary">Núcleo Técnico (Privado)</h2>
            </div>
            <p className="text-sm text-ink-secondary leading-relaxed">{projeto.core}</p>
          </section>
        )}

        {/* Links */}
        {(projeto.repoUrl || projeto.demoUrl) && (
          <section className="flex flex-wrap gap-3">
            {projeto.repoUrl && (
              <a href={projeto.repoUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 h-9 px-4 rounded-sm border border-border bg-elevated text-sm text-ink-primary hover:border-accent/30 transition-colors">
                <GitBranch size={14} /> Repositório
              </a>
            )}
            {projeto.demoUrl && (
              <a href={projeto.demoUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 h-9 px-4 rounded-sm bg-accent text-sm font-semibold text-white hover:bg-accent/90 transition-colors">
                <ExternalLink size={14} /> Demo
              </a>
            )}
          </section>
        )}

        {/* Contextual CTAs by mode */}
        {user && !isOwner && projeto.modos.length > 0 && (
          <QuietCard padding="md" tone="elevated" className="space-y-4">
            <h2 className="text-base font-semibold text-ink-primary">Participar</h2>
            <div className="flex flex-wrap gap-3">
              {projeto.modos.map((modo) => {
                const cta = MODO_CTA[modo];
                const Icon = cta.icon;
                const isColaboracao = modo === 'colaboracao';
                return (
                  <Button
                    key={modo}
                    variant="outline"
                    className="rounded-sm gap-2"
                    disabled={isColaboracao && accessRequestMutation.isPending}
                    onClick={() => {
                      if (isColaboracao) {
                        accessRequestMutation.mutate();
                      }
                    }}
                  >
                    <Icon size={16} /> {cta.label}
                  </Button>
                );
              })}
            </div>
          </QuietCard>
        )}

        {/* Owner actions */}
        {isOwner && (
          <div className="flex items-center gap-3 pt-4 border-t border-border">
            <Link to={`/app/projetos/${id}/editar`}>
              <Button variant="outline" className="rounded-sm">Editar Projeto</Button>
            </Link>
            {canDelete && (
              <Button
                variant="destructive"
                className="rounded-sm"
                isLoading={deleteMutation.isPending}
                onClick={() => { if (confirm('Eliminar projeto?')) deleteMutation.mutate(); }}
              >
                Eliminar
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

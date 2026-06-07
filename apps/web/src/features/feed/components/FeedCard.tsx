import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card, Avatar, Badge, Modal, ModalHeader, ModalTitle, Button } from '@/components/ui';
import { Heart, MessageSquare, Share2, Award, Bookmark, MoreHorizontal, Smile, Image as ImageIcon, Send, Copy, Mail } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { feedApi } from '@/lib/api/feed';
import { likeApi, bookmarkApi, commentsApi } from '@/lib/api/interactions';
import { mensagensApi } from '@/lib/api/mensagens';
import { vinculosApi } from '@/lib/api/vinculos';
import { toast } from '@/hooks/useToast';
import { useAuth } from '@/lib/auth/auth-context';
import type { FeedItem, Comment, InteractionTargetType } from '@pdc/shared';

interface FeedCardProps {
  item: FeedItem;
}

export function FeedCard({ item }: FeedCardProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isOwner = user?.id === item.userId;
  
  // Determine valid InteractionTargetType — posts and conquistas are the feed types
  const targetType: InteractionTargetType = item.tipo === 'conquista' ? 'conquista' : 'post';

  // ─── Like: real status from API ────────────────────────────────────────────
  const likeStatusQuery = useQuery({
    queryKey: ['like-status', targetType, item.id],
    queryFn: () => likeApi.getStatus(targetType, item.id),
    staleTime: 30_000,
  });

  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(item.stats?.likes ?? 0);
  const [bookmarked, setBookmarked] = useState(false);
  const [sharesCount, setSharesCount] = useState(item.stats?.shares ?? 0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isInternalShareOpen, setIsInternalShareOpen] = useState(false);
  const [editCorpo, setEditCorpo] = useState(item.corpo || item.descricao || '');
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const commentRef = useRef<HTMLInputElement>(null);

  // Sync like status from server when query resolves
  const likeData = likeStatusQuery.data;
  useEffect(() => {
    if (!likeData) return;
    setLiked(likeData.liked);
    setLikesCount(likeData.count);
  }, [likeData]);

  const bookmarkStatusQuery = useQuery({
    queryKey: ['bookmark-status', targetType, item.id],
    queryFn: () => bookmarkApi.getStatus(targetType, item.id),
    staleTime: 30_000,
  });
  const shareTargetsQuery = useQuery({
    queryKey: ['vinculos', 'partilha'],
    queryFn: vinculosApi.destinosPartilha,
    enabled: isInternalShareOpen,
  });

  useEffect(() => {
    if (bookmarkStatusQuery.data) setBookmarked(bookmarkStatusQuery.data.bookmarked);
  }, [bookmarkStatusQuery.data]);

  // ─── Comments: real API ──────────────────────────────────────────────────
  const commentsQuery = useQuery({
    queryKey: ['comments', targetType, item.id],
    queryFn: () => commentsApi.list(targetType, item.id),
    enabled: isCommentOpen,
  });

  const commentMutation = useMutation({
    mutationFn: (conteudo: string) => commentsApi.create({
      targetId: item.id,
      targetType,
      conteudo,
    }),
    onSuccess: () => {
      setCommentText('');
      void queryClient.invalidateQueries({ queryKey: ['comments', targetType, item.id] });
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
    onError: () => {
      toast({ variant: 'error', title: t('common.error', 'Erro'), description: t('feed.commentError', 'Não foi possível publicar o comentário.') });
    },
  });

  const comments: Comment[] = commentsQuery.data?.data ?? [];
  const visibleComments = comments.slice(0, 2);
  const totalComments = item.stats?.comentarios ?? comments.length;

  const handleSubmitComment = () => {
    const trimmed = commentText.trim();
    if (!trimmed || commentMutation.isPending) return;
    commentMutation.mutate(trimmed);
  };

  const conteudo = item.corpo || item.descricao || '';
  const isLongText = conteudo.length > 300;
  const displayedConteudo = isExpanded ? conteudo : (isLongText ? `${conteudo.substring(0, 300)}...` : conteudo);

  const relativeTime = formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: pt });

  const likeMutation = useMutation({
    mutationFn: () => likeApi.toggle({ targetId: item.id, targetType }),
    onMutate: () => {
      // Optimistic: toggle visual state
      setLiked((prev) => !prev);
      setLikesCount((prev) => liked ? prev - 1 : prev + 1);
    },
    onSuccess: (res) => {
      // Server is the source of truth
      setLiked(res.liked);
      // Refresh count from server
      void queryClient.invalidateQueries({ queryKey: ['like-status', targetType, item.id] });
    },
    onError: () => {
      // Revert to server state
      setLiked(likeData?.liked ?? false);
      setLikesCount(likeData?.count ?? item.stats?.likes ?? 0);
      toast({ variant: 'error', title: t('common.error', 'Erro'), description: t('feed.likeError', 'Não foi possível completar a ação.') });
    }
  });

  const bookmarkMutation = useMutation({
    mutationFn: () => bookmarkApi.toggle({ targetId: item.id, targetType }),
    onMutate: () => {
      setBookmarked((prev) => !prev);
    },
    onSuccess: (res) => {
      setBookmarked(res.bookmarked);
      void queryClient.invalidateQueries({ queryKey: ['bookmark-status', targetType, item.id] });
      void queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    },
    onError: () => {
      setBookmarked((prev) => !prev);
      toast({ variant: 'error', title: t('common.error', 'Erro'), description: t('feed.saveError', 'Não foi possível guardar.') });
    }
  });

  const shareMutation = useMutation({
    mutationFn: () => feedApi.sharePost(item.id),
    onSuccess: (res) => {
      setSharesCount(res.sharesCount);
    }
  });

  const handleShare = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: item.titulo,
          text: item.descricao || item.corpo || '',
          url: `${window.location.origin}/app/feed-posts/${item.id}`,
        });
        shareMutation.mutate();
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      setIsShareModalOpen(true);
    }
  };

  const shareUrl = `${window.location.origin}/app/feed-posts/${item.id}`;
  const shareText = item.descricao || item.corpo || item.titulo;

  const registerShare = () => {
    shareMutation.mutate();
    setIsShareModalOpen(false);
  };
  const internalShareMutation = useMutation({
    mutationFn: async (destinatarioId: string) => {
      const conversa = await mensagensApi.criarConversa(destinatarioId);
      await mensagensApi.enviar(conversa.id, `Partilhou uma publicação contigo:\n${shareUrl}`);
    },
    onSuccess: () => {
      registerShare();
      setIsInternalShareOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['mensagens', 'conversas'] });
      toast({ title: 'Partilhado no PDC', description: 'A publicação foi enviada por mensagem.', variant: 'success' });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Não foi possível partilhar',
        description: error instanceof Error ? error.message : 'Tenta novamente.',
        variant: 'error',
      });
    },
  });

  const editMutation = useMutation({
    mutationFn: () => feedApi.updatePost(item.id, { corpo: editCorpo }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      setIsEditModalOpen(false);
      toast({ title: 'Editado', description: 'Publicação atualizada com sucesso.', variant: 'success' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível editar a publicação.', variant: 'error' });
    }
  });

  return (
    <Card className="group relative overflow-hidden bg-[var(--chrome-surface)] border-[var(--chrome-border)] rounded-sm p-0">
      {/* Feed Header */}
      <div className="p-6 flex items-start justify-between border-b border-[var(--chrome-border)]">
        <div className="flex items-center gap-4">
          <Link to={`/app/perfil/${item.userId}`} className="shrink-0">
            <Avatar 
              src={item.avatar || undefined} 
              fallback={(item.autorNome || 'U').substring(0, 2)} 
              className="h-10 w-10 hover:opacity-80 transition-opacity border border-[var(--chrome-border)]" 
            />
          </Link>
          <div>
            <Link to={`/app/perfil/${item.userId}`} className="hover:underline">
              <h3 className="text-sm font-bold text-[var(--ink-primary)] leading-none mb-1.5">
                {item.autorNome || 'Utilizador PDC'}
              </h3>
            </Link>
            {item.tipo === 'conquista' && (
              <Badge className="bg-[var(--accent-success)]/10 text-[var(--accent-success)] border-[var(--accent-success)]/20 uppercase text-[9px] font-black tracking-widest rounded-sm">Conquista</Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <p className="text-xs text-[var(--ink-tertiary)] font-medium capitalize">
            {relativeTime}
          </p>
          <div className="relative">
            <button 
              onClick={() => { setIsMenuOpen(!isMenuOpen); }} 
              className="text-[var(--ink-tertiary)] hover:text-[var(--ink-primary)] transition-colors p-1 rounded-sm hover:bg-[var(--surface-elevated)]"
            >
              <MoreHorizontal size={18} />
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-32 bg-[var(--chrome-surface)] border border-[var(--chrome-border)] rounded-sm shadow-xl z-20 py-1 flex flex-col">
                <button 
                  onClick={() => { setIsMenuOpen(false); void navigator.clipboard.writeText(`${window.location.origin}/app/feed-posts/${item.id}`); toast({ variant: 'success', title: 'Copiado', description: 'Link copiado.' }); }}
                  className="text-xs font-semibold text-left px-4 py-2 hover:bg-[var(--surface-elevated)] text-[var(--ink-secondary)] transition-colors"
                >
                  {t('common.copyLink', 'Copiar Link')}
                </button>
                {isOwner && (
                  <button 
                    onClick={() => { setIsMenuOpen(false); setEditCorpo(item.corpo || item.descricao || ''); setIsEditModalOpen(true); }}
                    className="text-xs font-semibold text-left px-4 py-2 hover:bg-[var(--surface-elevated)] text-[var(--ink-secondary)] transition-colors"
                  >
                    {t('common.edit', 'Editar')}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Feed Content */}
      <div className="p-8 space-y-5">
        <div className="block space-y-3">
          <Link to={`/app/feed-posts/${item.id}`}>
            <h4 className="text-lg font-bold text-[var(--ink-primary)] tracking-tight leading-tight hover:text-[var(--accent-terracotta)] transition-colors">
              {item.titulo}
            </h4>
          </Link>
          <div className="text-[var(--ink-secondary)] text-sm leading-relaxed whitespace-pre-wrap">
            {displayedConteudo}
            {isLongText && (
              <button 
                onClick={(e) => { e.preventDefault(); setIsExpanded(!isExpanded); }}
                className="text-[var(--accent-terracotta)] font-semibold text-sm ml-2 hover:underline inline-flex"
              >
                {isExpanded ? t('common.readLess', 'Ler menos') : t('common.readMore', 'Ler mais...')}
              </button>
            )}
          </div>
        </div>

        {(item.mediaUrls?.length ?? 0) > 0 && (
          <div className={`grid gap-2 overflow-hidden rounded-sm border border-[var(--chrome-border)] bg-black ${item.mediaUrls && item.mediaUrls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {item.mediaUrls?.map((url) => (
              /\.mp4(?:$|\?)/i.test(url) ? (
                <video key={url} src={url} controls preload="metadata" className="max-h-[500px] w-full object-contain" />
              ) : (
                <Link key={url} to={`/app/feed-posts/${item.id}`} className="block overflow-hidden">
                  <img src={url} alt="" className="max-h-[500px] w-full object-cover transition-transform duration-500 group-hover:scale-[1.01]" />
                </Link>
              )
            ))}
          </div>
        )}
      </div>

      {/* Stats Summary Row */}
      <div className="px-6 py-2 flex items-center justify-between text-xs text-[var(--ink-tertiary)]">
        <div className="flex items-center gap-1.5">
          {likesCount > 0 && (
            <>
              <span className="flex items-center gap-0.5">
                <Heart size={14} className="text-[var(--accent-terracotta)] fill-current" />
              </span>
              <span className="font-medium">{likesCount}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {(item.stats?.comentarios ?? 0) > 0 && (
            <span className="font-medium">{item.stats?.comentarios} {t('feed.comments', 'comentários')}</span>
          )}
          {sharesCount > 0 && (
            <span className="font-medium">{sharesCount} {t('feed.shares', 'partilhas')}</span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-6 h-px bg-[var(--chrome-border)]" />

      {/* Action Buttons — evenly distributed */}
      <div className="px-2 py-1 grid grid-cols-4 relative z-10">
        <button 
          onClick={() => { likeMutation.mutate(); }} 
          disabled={likeMutation.isPending}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-sm transition-colors ${liked ? 'text-[var(--accent-terracotta)]' : 'text-[var(--ink-tertiary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-elevated)]'} disabled:opacity-50`}
        >
          <Heart size={18} className={liked ? "fill-current" : ""} />
          <span className="text-xs font-semibold">{t('common.like', 'Apoiar')}</span>
        </button>
        
        <button 
          onClick={() => { setIsCommentOpen(!isCommentOpen); setTimeout(() => commentRef.current?.focus(), 100); }}
          className="flex items-center justify-center gap-2 py-2.5 rounded-sm text-[var(--ink-tertiary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-elevated)] transition-colors"
        >
          <MessageSquare size={18} />
          <span className="text-xs font-semibold">{t('common.comment', 'Comentar')}</span>
        </button>
        
        <button onClick={() => { void handleShare(); }} className="flex items-center justify-center gap-2 py-2.5 rounded-sm text-[var(--ink-tertiary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-elevated)] transition-colors">
          <Share2 size={18} />
          <span className="text-xs font-semibold">{t('common.share', 'Partilhar')}</span>
        </button>

        <button 
          onClick={() => { bookmarkMutation.mutate(); }} 
          disabled={bookmarkMutation.isPending}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-sm transition-colors ${bookmarked ? 'text-[var(--accent-terracotta)]' : 'text-[var(--ink-tertiary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-elevated)]'} disabled:opacity-50`}
        >
          <Bookmark size={18} className={bookmarked ? "fill-current" : ""} />
          <span className="text-xs font-semibold">{t('common.save', 'Guardar')}</span>
        </button>
      </div>

      {/* Inline Comments Section */}
      {isCommentOpen && (
        <div className="border-t border-[var(--chrome-border)]">
          {/* Existing comments */}
          {visibleComments.length > 0 && (
            <div className="px-6 pt-3 space-y-3">
              {visibleComments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar
                    src={comment.autor?.avatarUrl || undefined}
                    fallback={(comment.autor?.nome || 'U').substring(0, 2)}
                    className="h-7 w-7 shrink-0 border border-[var(--chrome-border)]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-bold text-[var(--ink-primary)] truncate">{comment.autor?.nome || 'Utilizador'}</span>
                      <span className="text-[10px] text-[var(--ink-tertiary)] shrink-0">
                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: pt })}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--ink-secondary)] leading-snug mt-0.5">{comment.conteudo}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* "Ver todos" link */}
          {totalComments > 2 && (
            <div className="px-6 pt-2">
              <Link
                to={`/app/feed-posts/${item.id}`}
                className="text-xs font-semibold text-[var(--ink-tertiary)] hover:text-[var(--ink-primary)] transition-colors"
              >
                {t('feed.viewAllComments', `Ver todos os ${String(totalComments)} comentários`)}
              </Link>
            </div>
          )}

          {/* Comment composer */}
          <div className="px-4 py-3 flex items-center gap-3">
            <Avatar
              src={user?.avatarUrl ?? undefined}
              fallback={(user?.nome ?? 'U').substring(0, 2)}
              className="h-8 w-8 shrink-0 border border-[var(--chrome-border)]"
            />
            <div className="flex-1 relative">
              <input
                ref={commentRef}
                type="text"
                value={commentText}
                onChange={(e) => { setCommentText(e.target.value); }}
                placeholder={t('feed.addComment', 'Adicionar comentário...')}
                className="w-full h-9 rounded-full border border-[var(--chrome-border)] bg-[var(--surface-elevated)] px-4 pr-20 text-sm text-[var(--ink-primary)] outline-none placeholder:text-[var(--ink-tertiary)] focus:border-[var(--accent-terracotta)] transition-colors"
                disabled={commentMutation.isPending}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmitComment();
                }}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button className="p-1 text-[var(--ink-tertiary)] hover:text-[var(--ink-primary)] transition-colors" type="button">
                  <Smile size={16} />
                </button>
                <button className="p-1 text-[var(--ink-tertiary)] hover:text-[var(--ink-primary)] transition-colors" type="button">
                  <ImageIcon size={16} />
                </button>
                {commentText.trim() && (
                  <button
                    className="p-1 text-[var(--accent-terracotta)] hover:text-[var(--accent-terracotta-soft)] transition-colors"
                    type="button"
                    disabled={commentMutation.isPending}
                    onClick={handleSubmitComment}
                  >
                    <Send size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {item.tipo === 'conquista' && (
         <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
            <Award size={140} className="text-[var(--accent-terracotta)]" />
         </div>
      )}

      {/* Edit Modal Premium */}
      <Modal open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <ModalHeader className="mb-4">
          <ModalTitle className="text-xl font-bold font-serif">{t('feed.editPost', 'Editar Publicação')}</ModalTitle>
        </ModalHeader>
        <div className="relative">
          <textarea
            value={editCorpo}
            onChange={(e) => { setEditCorpo(e.target.value); }}
            rows={6}
            maxLength={2000}
            className="min-h-[120px] w-full resize-y rounded-md border border-[var(--chrome-border)] bg-[var(--surface-elevated)] p-4 pb-8 text-sm text-[var(--ink-primary)] outline-none transition-colors placeholder:text-[var(--ink-tertiary)] focus:border-[var(--accent-terracotta)] focus:ring-1 focus:ring-[var(--accent-terracotta)]"
          />
          <div className="absolute bottom-3 right-4 flex items-center gap-4 text-[10px] font-bold text-[var(--ink-tertiary)] tracking-widest">
            <span>{editCorpo.length.toLocaleString('pt-PT')} / 2 000</span>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => { setIsEditModalOpen(false); }}>
            {t('common.cancel', 'Cancelar')}
          </Button>
          <Button 
            className="bg-[var(--accent-terracotta)] hover:bg-[var(--accent-terracotta-soft)] text-white font-bold tracking-widest uppercase"
            onClick={() => { editMutation.mutate(); }}
            isLoading={editMutation.isPending}
            disabled={editCorpo.trim().length === 0 || editCorpo === (item.corpo || item.descricao || '')}
          >
            {t('common.save', 'Guardar')}
          </Button>
        </div>
      </Modal>
      <Modal open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
        <ModalHeader className="mb-4">
          <ModalTitle className="text-xl font-bold font-serif">Partilhar publicação</ModalTitle>
        </ModalHeader>
        <div className="grid gap-2">
          <button
            type="button"
            onClick={() => { setIsInternalShareOpen(true); }}
            className="flex min-h-11 items-center gap-3 border border-[var(--accent-terracotta)] px-4 text-sm font-semibold text-[var(--accent-terracotta)] hover:bg-[var(--accent-terracotta)]/10"
          >
            <Send size={18} /> Partilhar no PDC
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`}
            target="_blank"
            rel="noreferrer"
            onClick={registerShare}
            className="flex min-h-11 items-center gap-3 border border-[var(--chrome-border)] px-4 text-sm font-semibold text-[var(--ink-primary)] hover:bg-[var(--surface-elevated)]"
          >
            <Share2 size={18} /> WhatsApp
          </a>
          <a
            href={`mailto:?subject=${encodeURIComponent(item.titulo)}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`}
            onClick={registerShare}
            className="flex min-h-11 items-center gap-3 border border-[var(--chrome-border)] px-4 text-sm font-semibold text-[var(--ink-primary)] hover:bg-[var(--surface-elevated)]"
          >
            <Mail size={18} /> Email
          </a>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(shareUrl);
              toast({ variant: 'success', title: 'Link copiado', description: 'O link está pronto para partilhar.' });
              registerShare();
            }}
            className="flex min-h-11 items-center gap-3 border border-[var(--chrome-border)] px-4 text-sm font-semibold text-[var(--ink-primary)] hover:bg-[var(--surface-elevated)]"
          >
            <Copy size={18} /> Copiar link
          </button>
        </div>
      </Modal>
      <Modal open={isInternalShareOpen} onOpenChange={setIsInternalShareOpen}>
        <ModalHeader className="mb-4">
          <ModalTitle className="text-xl font-bold font-serif">Enviar para um vínculo</ModalTitle>
        </ModalHeader>
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {shareTargetsQuery.isLoading && <p className="py-5 text-center text-sm text-[var(--ink-secondary)]">A carregar vínculos...</p>}
          {!shareTargetsQuery.isLoading && (shareTargetsQuery.data?.data.length ?? 0) === 0 && (
            <div className="py-6 text-center">
              <p className="text-sm text-[var(--ink-secondary)]">Ainda não tens vínculos confirmados.</p>
              <Link to="/app/vinculos" className="mt-3 inline-block text-sm font-semibold text-[var(--accent-terracotta)]">Gerir vínculos</Link>
            </div>
          )}
          {shareTargetsQuery.data?.data.map((perfil) => (
            <button
              key={perfil.id}
              type="button"
              disabled={internalShareMutation.isPending}
              onClick={() => { internalShareMutation.mutate(perfil.userId); }}
              className="flex min-h-14 w-full items-center gap-3 border border-[var(--chrome-border)] px-3 text-left hover:bg-[var(--surface-elevated)] disabled:opacity-50"
            >
              <Avatar src={perfil.avatarUrl ?? undefined} fallback={perfil.nome.substring(0, 2)} className="h-9 w-9" />
              <span className="text-sm font-semibold text-[var(--ink-primary)]">{perfil.nome}</span>
            </button>
          ))}
        </div>
      </Modal>
    </Card>
  );
}

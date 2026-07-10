import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui';
import { Award } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { feedApi } from '@/lib/api/feed';
import { likeApi, bookmarkApi, commentsApi, sharesApi } from '@/lib/api/interactions';
import { toast } from '@/hooks/useToast';
import { useAuth } from '@/lib/auth/auth-context';
import type { FeedItem, Comment, InteractionTargetType } from '@pdc/shared';
import { FeedCardComments } from './FeedCardComments';
import { FeedCardContent } from './FeedCardContent';
import { FeedCardEngagement, FeedCardHeader } from './FeedCardChrome';
import { FeedCardModals } from './FeedCardModals';
import { InteractionTargetTypeSchema } from '@pdc/shared';
interface FeedCardProps {
  item: FeedItem;
}

function resolveInteractionTarget(item: FeedItem): { targetType: InteractionTargetType; targetId: string } | null {
  if (item.tipo === 'partilha') {
    return item.originalPost ? { targetType: 'post', targetId: item.originalPost.id } : null;
  }
  const targetType = InteractionTargetTypeSchema.options.find((t) => t === item.tipo);
  if (!targetType) return null;
  return { targetType, targetId: item.id };
}

export function FeedCard({ item }: FeedCardProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isOwner = user?.id === item.userId;
  const interactionTarget = resolveInteractionTarget(item);
  const interactionsEnabled = interactionTarget !== null;
  const targetType = interactionTarget?.targetType ?? 'post';
  const targetId = interactionTarget?.targetId ?? item.id;
  const likeStatusQuery = useQuery({
    queryKey: ['like-status', targetType, targetId],
    queryFn: () => likeApi.getStatus(targetType, targetId),
    staleTime: 30_000,
    enabled: interactionsEnabled,
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
  const [shareNote, setShareNote] = useState('');
  const [editCorpo, setEditCorpo] = useState(item.corpo || item.descricao || '');
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const commentRef = useRef<HTMLInputElement>(null);
  const likeData = likeStatusQuery.data;
  useEffect(() => {
    if (!likeData) return;
    setLiked(likeData.liked);
    setLikesCount(likeData.count);
  }, [likeData]);
  const bookmarkStatusQuery = useQuery({
    queryKey: ['bookmark-status', targetType, targetId],
    queryFn: () => bookmarkApi.getStatus(targetType, targetId),
    staleTime: 30_000,
    enabled: interactionsEnabled,
  });
  const shareStatusQuery = useQuery({
    queryKey: ['share-status', targetType, targetId],
    queryFn: () => sharesApi.status(targetType, targetId),
    staleTime: 30_000,
    enabled: isInternalShareOpen && interactionsEnabled,
  });
  useEffect(() => {
    if (bookmarkStatusQuery.data) setBookmarked(bookmarkStatusQuery.data.bookmarked);
  }, [bookmarkStatusQuery.data]);
  const commentsQuery = useQuery({
    queryKey: ['comments', targetType, targetId],
    queryFn: () => commentsApi.list(targetType, targetId),
    enabled: isCommentOpen && interactionsEnabled,
  });

  const commentMutation = useMutation({
    mutationFn: (conteudo: string) => commentsApi.create({
      targetId,
      targetType,
      conteudo,
    }),
    onSuccess: () => {
      setCommentText('');
      void queryClient.invalidateQueries({ queryKey: ['comments', targetType, targetId] });
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
    if (!trimmed || commentMutation.isPending || !interactionsEnabled) return;
    commentMutation.mutate(trimmed);
  };
  const conteudo = item.corpo || item.descricao || '';
  const isLongText = conteudo.length > 300;
  const displayedConteudo = isExpanded ? conteudo : (isLongText ? `${conteudo.substring(0, 300)}...` : conteudo);

  const relativeTime = formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: pt });
  const likeMutation = useMutation({
    mutationFn: () => {
      if (!interactionTarget) throw new Error('Tipo de conteúdo não suporta interações.');
      return likeApi.toggle(interactionTarget);
    },
    onMutate: () => {
      setLiked((prev) => !prev);
      setLikesCount((prev) => Math.max(0, liked ? prev - 1 : prev + 1));
    },
    onSuccess: (res) => {
      setLiked(res.liked);
      setLikesCount(res.count);
      void queryClient.invalidateQueries({ queryKey: ['like-status', targetType, targetId] });
    },
    onError: () => {
      setLiked(likeData?.liked ?? false);
      setLikesCount(likeData?.count ?? item.stats?.likes ?? 0);
      toast({ variant: 'error', title: t('common.error', 'Erro'), description: t('feed.likeError', 'Não foi possível completar a ação.') });
    }
  });
  const bookmarkMutation = useMutation({
    mutationFn: () => {
      if (!interactionTarget) throw new Error('Tipo de conteúdo não suporta interações.');
      return bookmarkApi.toggle(interactionTarget);
    },
    onMutate: () => {
      setBookmarked((prev) => !prev);
    },
    onSuccess: (res) => {
      setBookmarked(res.bookmarked);
      void queryClient.invalidateQueries({ queryKey: ['bookmark-status', targetType, targetId] });
      void queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    },
    onError: () => {
      setBookmarked((prev) => !prev);
      toast({ variant: 'error', title: t('common.error', 'Erro'), description: t('feed.saveError', 'Não foi possível guardar.') });
    }
  });
  const registerShareMutation = useMutation({
    mutationFn: (canal: 'whatsapp' | 'email' | 'outro') => {
      if (!interactionTarget) throw new Error('Tipo de conteúdo não suporta interações.');
      return sharesApi.create({ targetId: interactionTarget.targetId, targetType: interactionTarget.targetType, canal });
    },
    onSuccess: (res) => {
      setSharesCount(res.count);
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
    onError: () => {
      toast({ variant: 'error', title: 'Erro', description: 'Não foi possível registar a partilha.' });
    },
  });
  const handleShare = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: item.titulo,
          text: item.descricao || item.corpo || '',
          url: `${window.location.origin}/app/feed-posts/${item.id}`,
        });
        registerShareMutation.mutate('outro');
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      setIsShareModalOpen(true);
    }
  };
  const shareUrl = `${window.location.origin}/app/feed-posts/${item.id}`;
  const shareText = item.descricao || item.corpo || item.titulo;
  const registerShare = (canal: 'whatsapp' | 'email' | 'outro') => {
    registerShareMutation.mutate(canal);
    setIsShareModalOpen(false);
  };
  const internalShareMutation = useMutation({
    mutationFn: () => {
      if (!interactionTarget) throw new Error('Tipo de conteúdo não suporta interações.');
      return sharesApi.create({
      targetId: interactionTarget.targetId,
      targetType: interactionTarget.targetType,
      canal: 'interno',
      nota: shareNote.trim() || undefined,
      });
    },
    onSuccess: (res) => {
      setSharesCount(res.count);
      setShareNote('');
      setIsInternalShareOpen(false);
      setIsShareModalOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      void queryClient.invalidateQueries({ queryKey: ['share-status', targetType, targetId] });
      toast({ title: 'Republicado', description: 'A publicação aparece agora no teu feed e perfil.', variant: 'success' });
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
      <FeedCardHeader
        item={item}
        relativeTime={relativeTime}
        isOwner={isOwner}
        menuOpen={isMenuOpen}
        onMenuToggle={() => { setIsMenuOpen((open) => !open); }}
        onCopyLink={() => {
          setIsMenuOpen(false);
          void navigator.clipboard.writeText(`${window.location.origin}/app/feed-posts/${item.id}`);
          toast({ variant: 'success', title: 'Copiado', description: 'Link copiado.' });
        }}
        onEdit={() => {
          setIsMenuOpen(false);
          setEditCorpo(item.corpo || item.descricao || '');
          setIsEditModalOpen(true);
        }}
      />

      <FeedCardContent
        item={item}
        displayedContent={displayedConteudo}
        isLongText={isLongText}
        isExpanded={isExpanded}
        onToggleExpanded={() => { setIsExpanded((current) => !current); }}
        readMoreLabel={t('common.readMore', 'Ler mais...')}
        readLessLabel={t('common.readLess', 'Ler menos')}
      />

      <FeedCardEngagement
        likesCount={likesCount}
        commentsCount={item.stats?.comentarios ?? 0}
        sharesCount={sharesCount}
        liked={liked}
        bookmarked={bookmarked}
        likePending={likeMutation.isPending || !interactionsEnabled}
        bookmarkPending={bookmarkMutation.isPending || !interactionsEnabled}
        onLike={() => { likeMutation.mutate(); }}
        onComment={() => {
          if (!interactionsEnabled) return;
          setIsCommentOpen((open) => !open);
          setTimeout(() => commentRef.current?.focus(), 100);
        }}
        onShare={() => {
          if (!interactionsEnabled) return;
          void handleShare();
        }}
        onBookmark={() => { bookmarkMutation.mutate(); }}
      />

      {isCommentOpen && (
        <FeedCardComments
          comments={visibleComments}
          totalComments={totalComments}
          postId={item.id}
          currentUserAvatar={user?.avatarUrl}
          currentUserName={user?.nome}
          commentText={commentText}
          isPending={commentMutation.isPending}
          commentRef={commentRef}
          onTextChange={setCommentText}
          onSubmit={handleSubmitComment}
          viewAllLabel={t('feed.viewAllComments', `Ver todos os ${String(totalComments)} comentários`)}
          placeholder={t('feed.addComment', 'Adicionar comentário...')}
        />
      )}

      {item.tipo === 'conquista' && (
         <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
            <Award size={140} className="text-[var(--accent-terracotta)]" />
         </div>
      )}

      <FeedCardModals
        editOpen={isEditModalOpen}
        shareOpen={isShareModalOpen}
        internalShareOpen={isInternalShareOpen}
        editBody={editCorpo}
        originalBody={item.corpo || item.descricao || ''}
        shareNote={shareNote}
        shareText={shareText}
        shareUrl={shareUrl}
        title={item.titulo}
        alreadyShared={shareStatusQuery.data?.shared ?? false}
        shareStatusLoading={shareStatusQuery.isLoading}
        editPending={editMutation.isPending}
        sharePending={internalShareMutation.isPending}
        onEditOpenChange={setIsEditModalOpen}
        onShareOpenChange={setIsShareModalOpen}
        onInternalShareOpenChange={setIsInternalShareOpen}
        onEditBodyChange={setEditCorpo}
        onShareNoteChange={setShareNote}
        onSaveEdit={() => { editMutation.mutate(); }}
        onInternalShare={() => { internalShareMutation.mutate(); }}
        onExternalShare={registerShare}
        onCopyLink={() => {
          void navigator.clipboard.writeText(shareUrl);
          toast({ variant: 'success', title: 'Link copiado', description: 'O link está pronto para partilhar.' });
          registerShare('outro');
        }}
      />
    </Card>
  );
}

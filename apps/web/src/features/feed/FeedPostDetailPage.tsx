import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Send, MessageSquare } from 'lucide-react';
import { Avatar, Button, Card } from '@/components/ui';
import { FeedCardSkeleton } from '@/components/ui/Skeleton';
import { feedApi } from '@/lib/api/feed';
import { commentsApi } from '@/lib/api/interactions';
import { toast } from '@/hooks/useToast';
import { FeedCard } from './components/FeedCard';
import type { FeedItem } from '@pdc/shared';
import { useAuth } from '@/lib/auth/auth-context';

export function FeedPostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState('');

  // Fetch Post Details
  const { data: post, isLoading: isLoadingPost } = useQuery({
    queryKey: ['feed-posts', id],
    queryFn: () => feedApi.getPost(id ?? ''),
    enabled: !!id,
  });

  // Fetch Comments
  const { data: commentsRes, isLoading: isLoadingComments } = useQuery({
    queryKey: ['comments', 'post', id],
    queryFn: () => commentsApi.list('post', id ?? ''),
    enabled: !!id,
  });

  const comments = commentsRes?.data ?? [];

  // Create Comment Mutation
  const commentMutation = useMutation({
    mutationFn: () => commentsApi.create({ targetId: id ?? '', targetType: 'post', conteudo: commentText }),
    onSuccess: () => {
      setCommentText('');
      void queryClient.invalidateQueries({ queryKey: ['comments', 'post', id] });
      toast({ variant: 'success', title: t('common.success', 'Sucesso'), description: t('feed.commentAdded', 'Comentário adicionado.') });
    },
    onError: () => {
      toast({ variant: 'error', title: t('common.error', 'Erro'), description: t('feed.commentError', 'Não foi possível enviar o comentário.') });
    }
  });

  if (isLoadingPost) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <FeedCardSkeleton />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h2 className="text-xl font-bold text-[var(--ink-primary)]">{t('feed.postNotFound', 'Publicação não encontrada')}</h2>
        <Button variant="outline" className="mt-4" onClick={() => { navigate('/app/feed'); }}>
          {t('common.back', 'Voltar')}
        </Button>
      </div>
    );
  }

  // Adapter to convert FeedPost to FeedItem format required by FeedCard
  // This is slightly hacky but prevents duplicating the UI of the feed card.
  // Idealy FeedCard should accept a unified "Post" type or we fetch via unified endpoint.
  const feedItemAdapter: FeedItem = {
    id: post.id,
    tipo: 'post',
    titulo: 'Post', // Fallback
    corpo: post.corpo,
    userId: post.autorId,
    autorNome: post.autor?.nome,
    avatar: post.autor?.avatarUrl,
    createdAt: post.createdAt,
    imagem: post.mediaUrls?.[0] || undefined,
    stats: {
      likes: post.likesCount,
      ratingMedia: 0,
      ratingTotal: 0
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6 animate-in fade-in duration-700">
      <button 
        onClick={() => { navigate('/app/feed'); }}
        className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-[var(--ink-tertiary)] hover:text-[var(--ink-primary)] transition-colors mb-4"
      >
        <ArrowLeft size={16} /> {t('common.back', 'Voltar ao Feed')}
      </button>

      {/* Main Post Content */}
      <FeedCard item={feedItemAdapter} />

      {/* Comments Section */}
      <div className="space-y-6">
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--ink-secondary)] px-2">
          {t('feed.comments', 'Comentários')} ({comments.length})
        </h3>

        {/* Comment Composer */}
        <Card className="p-4 bg-[var(--chrome-surface)] border-[var(--chrome-border)] rounded-sm flex gap-4">
          <Avatar 
            src={user?.avatarUrl || undefined} 
            fallback={(user?.nome || 'U').substring(0, 2)} 
            className="h-10 w-10 shrink-0 border border-[var(--chrome-border)]"
          />
          <div className="flex-1 space-y-3">
            <textarea
              value={commentText}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => { setCommentText(e.target.value); }}
              placeholder={comments.length === 0 ? t('feed.firstToComment', 'Sê o primeiro a comentar...') : t('feed.addComment', 'Adiciona um comentário...')}
              className="min-h-[80px] w-full bg-[var(--surface-elevated)] border-none text-[var(--ink-primary)] p-3 placeholder:text-[var(--ink-tertiary)] rounded-sm resize-none focus:outline-none focus:ring-1 focus:ring-[var(--accent-terracotta)]"
            />
            <div className="flex justify-end">
              <Button 
                disabled={!commentText.trim() || commentMutation.isPending}
                onClick={() => { commentMutation.mutate(); }}
                className="bg-[var(--accent-terracotta)] hover:bg-[var(--accent-terracotta)]/90 text-white rounded-sm h-8 px-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
              >
                {t('common.send', 'Enviar')} <Send size={12} />
              </Button>
            </div>
          </div>
        </Card>

        {/* Comments List */}
        {isLoadingComments ? (
          <div className="space-y-4">
            <FeedCardSkeleton />
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-4 p-4 rounded-sm hover:bg-[var(--surface-elevated)]/50 transition-colors">
                <Avatar 
                  src={comment.autor?.avatarUrl || undefined} 
                  fallback={(comment.autor?.nome || 'U').substring(0, 2)} 
                  className="h-8 w-8 shrink-0 border border-[var(--chrome-border)]"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-[var(--ink-primary)]">{comment.autor?.nome || 'Utilizador PDC'}</span>
                    <span className="text-[10px] text-[var(--ink-tertiary)] uppercase tracking-widest">
                      {new Date(comment.createdAt).toLocaleDateString('pt-PT')}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--ink-secondary)] whitespace-pre-wrap">{comment.conteudo}</p>
                </div>
              </div>
            ))}
            
            {comments.length === 0 && (
              <div className="text-center py-12">
                <MessageSquare size={32} className="mx-auto text-[var(--ink-tertiary)] opacity-20 mb-3" />
                <p className="text-[11px] font-bold text-[var(--ink-tertiary)] uppercase tracking-widest">
                  {t('feed.noComments', 'Nenhum comentário ainda.')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

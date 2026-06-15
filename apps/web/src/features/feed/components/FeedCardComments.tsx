import type { Ref } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Send } from 'lucide-react';
import type { Comment } from '@pdc/shared';
import { Avatar } from '@/components/ui';

interface FeedCardCommentsProps {
  comments: Comment[];
  totalComments: number;
  postId: string;
  currentUserAvatar: string | null | undefined;
  currentUserName: string | null | undefined;
  commentText: string;
  isPending: boolean;
  commentRef: Ref<HTMLInputElement>;
  onTextChange: (value: string) => void;
  onSubmit: () => void;
  viewAllLabel: string;
  placeholder: string;
}

export function FeedCardComments({
  comments,
  totalComments,
  postId,
  currentUserAvatar,
  currentUserName,
  commentText,
  isPending,
  commentRef,
  onTextChange,
  onSubmit,
  viewAllLabel,
  placeholder,
}: FeedCardCommentsProps): React.JSX.Element {
  return (
    <div className="border-t border-[var(--chrome-border)]">
      {comments.length > 0 && (
        <div className="space-y-3 px-6 pt-3">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <Avatar
                src={comment.autor.avatarUrl || undefined}
                fallback={(comment.autor.nome || 'U').substring(0, 2)}
                className="h-7 w-7 shrink-0 border border-[var(--chrome-border)]"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="truncate text-xs font-bold text-[var(--ink-primary)]">
                    {comment.autor.nome || 'Utilizador'}
                  </span>
                  <span className="shrink-0 text-[10px] text-[var(--ink-tertiary)]">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: pt })}
                  </span>
                </div>
                <p className="mt-0.5 text-sm leading-snug text-[var(--ink-secondary)]">
                  {comment.conteudo}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalComments > 2 && (
        <div className="px-6 pt-2">
          <Link
            to={`/app/feed-posts/${postId}`}
            className="text-xs font-semibold text-[var(--ink-tertiary)] transition-colors hover:text-[var(--ink-primary)]"
          >
            {viewAllLabel}
          </Link>
        </div>
      )}

      <div className="flex items-center gap-3 px-4 py-3">
        <Avatar
          src={currentUserAvatar ?? undefined}
          fallback={(currentUserName ?? 'U').substring(0, 2)}
          className="h-8 w-8 shrink-0 border border-[var(--chrome-border)]"
        />
        <div className="relative flex-1">
          <input
            ref={commentRef}
            type="text"
            value={commentText}
            onChange={(event) => { onTextChange(event.target.value); }}
            placeholder={placeholder}
            className="h-9 w-full rounded-full border border-[var(--chrome-border)] bg-[var(--surface-elevated)] px-4 pr-20 text-sm text-[var(--ink-primary)] outline-none transition-colors placeholder:text-[var(--ink-tertiary)] focus:border-[var(--accent-terracotta)]"
            disabled={isPending}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onSubmit();
            }}
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {commentText.trim() && (
              <button
                className="p-1 text-[var(--accent-terracotta)]"
                type="button"
                disabled={isPending}
                onClick={onSubmit}
                aria-label="Enviar comentário"
              >
                <Send size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

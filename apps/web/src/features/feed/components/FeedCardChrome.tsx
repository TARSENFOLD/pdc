import { Link } from 'react-router-dom';
import { Bookmark, Heart, MessageSquare, MoreHorizontal, Share2 } from 'lucide-react';
import type { FeedItem } from '@pdc/shared';
import { Avatar, Badge } from '@/components/ui';

interface FeedCardHeaderProps {
  item: FeedItem;
  relativeTime: string;
  isOwner: boolean;
  menuOpen: boolean;
  onMenuToggle: () => void;
  onCopyLink: () => void;
  onEdit: () => void;
}

export function FeedCardHeader({
  item,
  relativeTime,
  isOwner,
  menuOpen,
  onMenuToggle,
  onCopyLink,
  onEdit,
}: FeedCardHeaderProps): React.JSX.Element {
  return (
    <div className="flex items-start justify-between border-b border-[var(--chrome-border)] p-6">
      <div className="flex items-center gap-4">
        <Link to={`/app/perfil/${item.userId}`} className="shrink-0">
          <Avatar
            src={item.avatar || undefined}
            fallback={(item.autorNome || 'U').substring(0, 2)}
            className="h-10 w-10 border border-[var(--chrome-border)] transition-opacity hover:opacity-80"
          />
        </Link>
        <div>
          <Link to={`/app/perfil/${item.userId}`} className="hover:underline">
            <h3 className="mb-1.5 text-sm font-bold leading-none text-[var(--ink-primary)]">
              {item.autorNome || 'Utilizador PDC'}
            </h3>
          </Link>
          {item.tipo === 'conquista' && (
            <Badge className="rounded-sm border-[var(--accent-success)]/20 bg-[var(--accent-success)]/10 text-[9px] font-black uppercase tracking-widest text-[var(--accent-success)]">
              Conquista
            </Badge>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <p className="text-xs font-medium capitalize text-[var(--ink-tertiary)]">{relativeTime}</p>
        <div className="relative">
          <button type="button" onClick={onMenuToggle} className="p-1 text-[var(--ink-tertiary)]" aria-label="Mais opções">
            <MoreHorizontal size={18} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-20 mt-1 flex w-32 flex-col rounded-sm border border-[var(--chrome-border)] bg-[var(--chrome-surface)] py-1 shadow-xl">
              <button type="button" onClick={onCopyLink} className="px-4 py-2 text-left text-xs font-semibold text-[var(--ink-secondary)]">
                Copiar Link
              </button>
              {isOwner && (
                <button type="button" onClick={onEdit} className="px-4 py-2 text-left text-xs font-semibold text-[var(--ink-secondary)]">
                  Editar
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface FeedCardEngagementProps {
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  liked: boolean;
  bookmarked: boolean;
  likePending: boolean;
  bookmarkPending: boolean;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onBookmark: () => void;
}

export function FeedCardEngagement(props: FeedCardEngagementProps): React.JSX.Element {
  return (
    <>
      <div className="flex items-center justify-between px-6 py-2 text-xs text-[var(--ink-tertiary)]">
        <span className="flex items-center gap-1.5">
          {props.likesCount > 0 && <><Heart size={14} className="fill-current text-[var(--accent-terracotta)]" />{props.likesCount}</>}
        </span>
        <span className="flex items-center gap-3">
          {props.commentsCount > 0 && <span>{props.commentsCount} comentários</span>}
          {props.sharesCount > 0 && <span>{props.sharesCount} partilhas</span>}
        </span>
      </div>
      <div className="mx-6 h-px bg-[var(--chrome-border)]" />
      <div className="relative z-10 grid grid-cols-4 px-2 py-1">
        <ActionButton icon={<Heart size={18} className={props.liked ? 'fill-current' : ''} />} label="Apoiar" active={props.liked} disabled={props.likePending} onClick={props.onLike} />
        <ActionButton icon={<MessageSquare size={18} />} label="Comentar" onClick={props.onComment} />
        <ActionButton icon={<Share2 size={18} />} label="Partilhar" onClick={props.onShare} />
        <ActionButton icon={<Bookmark size={18} className={props.bookmarked ? 'fill-current' : ''} />} label="Guardar" active={props.bookmarked} disabled={props.bookmarkPending} onClick={props.onBookmark} />
      </div>
    </>
  );
}

function ActionButton(props: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      className={`flex items-center justify-center gap-2 rounded-sm py-2.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${props.active ? 'text-[var(--accent-terracotta)]' : 'text-[var(--ink-tertiary)]'}`}
    >
      {props.icon}{props.label}
    </button>
  );
}

import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import type { FeedItem } from '@pdc/shared';
import { Avatar } from '@/components/ui';

interface FeedCardContentProps {
  item: FeedItem;
  displayedContent: string;
  isLongText: boolean;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  readMoreLabel: string;
  readLessLabel: string;
}

function relativeTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'há instantes'
    : formatDistanceToNow(date, { addSuffix: true, locale: pt });
}

export function FeedCardContent({
  item,
  displayedContent,
  isLongText,
  isExpanded,
  onToggleExpanded,
  readMoreLabel,
  readLessLabel,
}: FeedCardContentProps): React.JSX.Element {
  return (
    <div className="space-y-5 p-8">
      <div className="block space-y-3">
        <Link to={`/app/feed-posts/${item.id}`}>
          <h4 className="text-lg font-bold leading-tight tracking-tight text-[var(--ink-primary)] transition-colors hover:text-[var(--accent-terracotta)]">
            {item.titulo}
          </h4>
        </Link>
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--ink-secondary)]">
          {displayedContent}
          {isLongText && (
            <button
              onClick={onToggleExpanded}
              className="ml-2 inline-flex text-sm font-semibold text-[var(--accent-terracotta)] hover:underline"
            >
              {isExpanded ? readLessLabel : readMoreLabel}
            </button>
          )}
        </div>
      </div>

      {(item.mediaUrls?.length ?? 0) > 0 && (
        <div className={`grid gap-2 overflow-hidden rounded-sm border border-[var(--chrome-border)] bg-black ${(item.mediaUrls?.length ?? 0) > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {item.mediaUrls?.map((url, index) => (
            /\.(mp4|webm|mov|m4v)(?:[?#]|$)/i.test(url) ? (
              <video key={`${url}-${String(index)}`} src={url} controls preload="metadata" className="max-h-[500px] w-full object-contain" />
            ) : (
              <Link key={`${url}-${String(index)}`} to={`/app/feed-posts/${item.id}`} className="group block overflow-hidden">
                <img src={url} alt={`${item.titulo} - imagem ${String(index + 1)}`} className="max-h-[500px] w-full object-cover transition-transform duration-500 group-hover:scale-[1.01]" />
              </Link>
            )
          ))}
        </div>
      )}

      {item.originalPost && (
        <Link
          to={`/app/feed-posts/${item.originalPost.id}`}
          className="block border border-[var(--chrome-border)] bg-[var(--surface-elevated)] p-5 hover:border-[var(--accent-terracotta)]/40"
        >
          <div className="mb-3 flex items-center gap-3">
            <Avatar
              src={item.originalPost.avatar ?? undefined}
              fallback={(item.originalPost.autorNome?.trim() || 'U').substring(0, 2)}
              className="h-8 w-8"
            />
            <div>
              <p className="text-sm font-bold text-[var(--ink-primary)]">
                {item.originalPost.autorNome ?? 'Utilizador PDC'}
              </p>
              <p className="text-[10px] text-[var(--ink-tertiary)]">
                {relativeTime(item.originalPost.createdAt)}
              </p>
            </div>
          </div>
          <h5 className="text-base font-bold text-[var(--ink-primary)]">{item.originalPost.titulo}</h5>
          <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-relaxed text-[var(--ink-secondary)]">
            {item.originalPost.corpo}
          </p>
          {(item.originalPost.mediaUrls?.length ?? 0) > 0 && (
            <img
              src={item.originalPost.mediaUrls?.[0]}
              alt=""
              className="mt-4 max-h-72 w-full object-cover"
            />
          )}
        </Link>
      )}
    </div>
  );
}

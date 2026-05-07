import { useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface CarouselProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  emptyState?: ReactNode;
  ariaLabel: string;
  itemMinWidth?: number;
  className?: string;
  'data-testid'?: string;
}

export function Carousel<T>({
  items,
  renderItem,
  emptyState,
  ariaLabel,
  itemMinWidth = 280,
  className,
  'data-testid': testId,
}: CarouselProps<T>) {
  const trackRef = useRef<HTMLDivElement>(null);

  if (items.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div
      data-testid={testId}
      role="region"
      aria-label={ariaLabel}
      className={cn('relative', className)}
    >
      <div
        ref={trackRef}
        className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth"
        style={{ scrollbarWidth: 'none' }}
      >
        {items.map((item, i) => (
          <div
            key={i}
            className="shrink-0 snap-start"
            style={{ minWidth: itemMinWidth, maxWidth: itemMinWidth }}
          >
            {renderItem(item, i)}
          </div>
        ))}
      </div>
    </div>
  );
}

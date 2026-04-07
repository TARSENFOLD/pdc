import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl border border-border bg-surface text-text-primary shadow-sm transition-all',
          interactive && 'hover:bg-surface-raised hover:border-accent/20 cursor-pointer active:scale-[0.98]',
          className
        )}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

export { Card };

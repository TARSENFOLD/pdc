import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';

export interface QuietHeroProps {
  kicker?: string | undefined;
  title: string;
  description?: string | undefined;
  actions?: ReactNode | undefined;
  serif?: boolean;
  'data-testid'?: string | undefined;
}

const SPRING = { type: 'spring', stiffness: 220, damping: 28 } as const;

export function QuietHero({
  kicker,
  title,
  description,
  actions,
  serif = true,
  'data-testid': testId,
}: QuietHeroProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING}
      className="space-y-4"
    >
      {kicker && (
        <p 
          data-testid="quiet-hero-kicker"
          className="text-xs font-semibold uppercase tracking-widest text-ink-secondary"
        >
          {kicker}
        </p>
      )}
      <h1
        data-testid={testId ?? 'page-hero-title'}
        className={cn(
          'text-display-lg font-black tracking-tight text-ink-primary',
          serif ? 'font-authority italic' : 'font-sans'
        )}
      >
        {title}
      </h1>
      {description && (
        <p className="text-body-lg text-ink-secondary leading-relaxed max-w-2xl">
          {description}
        </p>
      )}
      {actions && (
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {actions}
        </div>
      )}
    </motion.header>
  );
}

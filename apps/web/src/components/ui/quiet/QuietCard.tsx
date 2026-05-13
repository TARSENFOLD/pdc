import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface QuietCardProps {
  padding?: 'sm' | 'md' | 'lg';
  tone?: 'neutral' | 'recessed' | 'elevated';
  className?: string;
  children: ReactNode;
  'data-testid'?: string;
}

const PADDINGS = { sm: 'p-4', md: 'p-6', lg: 'p-8' } as const;
const TONES = {
  neutral: 'bg-elevated border-ink-tertiary/10',
  recessed: 'bg-recessed border-ink-tertiary/10',
  elevated: 'bg-elevated border-ink-tertiary/20 shadow-sm',
} as const;

export function QuietCard({
  padding = 'md',
  tone = 'neutral',
  className,
  children,
  'data-testid': testId,
}: QuietCardProps) {
  return (
    <div
      data-testid={testId}
      className={cn('rounded-sm border', PADDINGS[padding], TONES[tone], className)}
    >
      {children}
    </div>
  );
}

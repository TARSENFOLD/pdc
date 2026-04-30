import { type ElementType } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface QuietStatProps {
  label: string;
  value: string | number;
  trend?: { delta: number; direction: 'up' | 'down' };
  href?: string;
  icon?: ElementType;
  className?: string;
  'data-testid'?: string;
}

export function QuietStat({
  label,
  value,
  trend,
  href,
  icon: Icon,
  className,
  'data-testid': testId,
}: QuietStatProps) {
  const content = (
    <div
      data-testid={testId}
      className={cn(
        'flex flex-col gap-1 p-4 rounded-lg bg-elevated border border-ink-tertiary/10 min-w-0',
        href && 'hover:border-accent/30 transition-colors cursor-pointer',
        className,
      )}
    >
      <div className="flex items-center gap-1.5">
        {Icon && <Icon size={14} className="text-ink-tertiary shrink-0" />}
        <span className="text-xs text-ink-tertiary truncate">{label}</span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-mono font-semibold text-ink-primary tracking-tight">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {trend && (
          <span
            className={cn(
              'text-xs font-medium pb-0.5',
              trend.direction === 'up' ? 'text-accent-success' : 'text-accent-danger',
            )}
          >
            {trend.direction === 'up' ? '+' : '-'}{Math.abs(trend.delta)}%
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return <Link to={href} className="block min-h-[44px]">{content}</Link>;
  }
  return content;
}

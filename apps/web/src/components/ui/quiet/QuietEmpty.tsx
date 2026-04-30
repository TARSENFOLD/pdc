import React from 'react';
import { type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import QuietButton from './QuietButton';

export interface QuietEmptyProps {
  icon: LucideIcon;
  message: string;
  description?: string;
  action?: {
    label: string;
    to: string;
  };
  className?: string;
  'data-testid'?: string;
}

export function QuietEmpty({
  icon: Icon,
  message,
  description,
  action,
  className,
  'data-testid': testId,
}: QuietEmptyProps): React.ReactElement {
  return (
    <div
      data-testid={testId}
      className={cn(
        'flex flex-col items-center justify-center p-12 text-center space-y-6',
        'bg-elevated/30 rounded-3xl border border-dashed border-white/5',
        className
      )}
    >
      <div className="h-20 w-20 bg-accent-terracotta/10 rounded-2xl flex items-center justify-center text-accent-terracotta shadow-inner">
        <Icon size={40} strokeWidth={1.5} />
      </div>

      <div className="space-y-2 max-w-sm">
        <h3 className="text-2xl font-authority italic text-ink-primary tracking-tight">
          {message}
        </h3>
        {description && (
          <p className="text-sm text-ink-tertiary leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {action && (
        <Link to={action.to} className="pt-2">
          <QuietButton variant="hero" size="sm">
            {action.label}
          </QuietButton>
        </Link>
      )}
    </div>
  );
}

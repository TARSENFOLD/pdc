import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';

export interface QuietSectionProps {
  kicker?: string;
  title?: string;
  action?: { label: string; to: string };
  children: ReactNode;
  'data-testid'?: string;
}

export function QuietSection({ kicker, title, action, children, 'data-testid': testId }: QuietSectionProps) {
  return (
    <section data-testid={testId} className="space-y-4">
      {(kicker || title || action) && (
        <div className="flex items-center justify-between gap-4">
          <div>
            {kicker && (
              <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-0.5">
                {kicker}
              </p>
            )}
            {title && <h2 className="text-lg font-semibold text-ink-primary">{title}</h2>}
          </div>
          {action && (
            <Link
              to={action.to}
              className="text-xs font-medium text-ink-tertiary hover:text-accent transition-colors min-h-[44px] flex items-center"
            >
              {action.label} →
            </Link>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

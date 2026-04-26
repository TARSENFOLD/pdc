import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, children, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-xs font-bold text-ink-secondary uppercase tracking-widest">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={cn(
            'h-11 w-full rounded-xl border border-ink-tertiary/10 bg-recessed px-4 text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50',
            error && 'border-red-500/50 focus:ring-red-500',
            className
          )}
          {...props}
        >
          {children}
        </select>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

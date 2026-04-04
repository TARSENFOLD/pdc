import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, leftIcon, rightIcon, id, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label ? (
          <label htmlFor={id} className="text-sm font-medium text-text-secondary">
            {label}
          </label>
        ) : null}
        <div className="relative group">
          {leftIcon ? (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-amber transition-colors">
              {leftIcon}
            </div>
          ) : null}
          <input
            ref={ref}
            id={id}
            className={cn(
              'flex h-10 w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              error && 'border-error focus-visible:ring-error',
              className
            )}
            {...props}
          />
          {rightIcon ? (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-amber transition-colors">
              {rightIcon}
            </div>
          ) : null}
        </div>
        {error ? (
          <p className="text-xs font-medium text-error mt-1">{error}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };

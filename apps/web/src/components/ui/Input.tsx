import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null | undefined;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, leftIcon, rightIcon, id, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label ? (
          <label htmlFor={id} className="text-sm font-medium text-ink-secondary">
            {label}
          </label>
        ) : null}
        <div className="relative group">
          {leftIcon ? (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary group-focus-within:text-accent transition-colors">
              {leftIcon}
            </div>
          ) : null}
          <input
            ref={ref}
            id={id}
            className={cn(
              'flex h-11 w-full rounded-md border border-ink-tertiary/20 bg-recessed px-3 py-2 text-sm text-ink-primary ring-offset-canvas file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-ink-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all touch-target',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              error && 'border-red-500 focus-visible:ring-red-500',
              className
            )}
            {...props}
          />
          {rightIcon ? (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-tertiary group-focus-within:text-accent transition-colors">
              {rightIcon}
            </div>
          ) : null}
        </div>
        {error ? (
          <p className="text-xs font-medium text-red-500 mt-1">{error}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };

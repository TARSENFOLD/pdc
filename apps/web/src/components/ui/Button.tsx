import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, asChild = false, children, ...props }, ref) => {
    const Component = asChild ? Slot : 'button';

    const variants = {
      primary: 'bg-amber text-background hover:bg-amber-hover border-transparent',
      secondary: 'bg-surface-raised text-text-primary hover:bg-white/10 border-border',
      ghost: 'bg-transparent text-text-secondary hover:bg-white/5 border-transparent',
      danger: 'bg-error/10 text-error hover:bg-error/20 border-error/20',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-10 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
    };

    return (
      <Component
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber disabled:opacity-50 disabled:cursor-not-allowed border',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </Component>
    );
  }
);

Button.displayName = 'Button';

export { Button };

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, asChild = false, children, ...props }, ref) => {
    const Component = asChild ? Slot : 'button';

    const variants = {
      primary: 'bg-accent text-ink-on-accent hover:bg-accent-soft border-transparent shadow-lg shadow-accent/10 asymmetric-a',
      secondary: 'bg-recessed text-ink-primary hover:bg-canvas/50 border-ink-tertiary/10',
      ghost: 'bg-transparent text-ink-secondary hover:bg-recessed border-transparent',
      danger: 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20',
    };

    const sizes = {
      sm: 'h-11 px-4 text-xs', // Min 44px
      md: 'h-11 px-5 text-sm',
      lg: 'h-14 px-8 text-base',
      icon: 'h-11 w-11 p-0',
    };

    return (
      <Component
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 disabled:cursor-not-allowed border active:scale-[0.98] touch-target',
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

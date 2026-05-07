import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Slot, Slottable } from '@radix-ui/react-slot';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, asChild = false, children, ...props }, ref) => {
    const Component = asChild ? Slot : 'button';

    const variants = {
      primary: 'bg-accent text-ink-on-accent hover:bg-accent-soft border-transparent shadow-lg shadow-accent/10 asymmetric-a',
      secondary: 'bg-recessed text-ink-primary hover:bg-canvas/50 border-border asymmetric-b',
      ghost: 'bg-transparent text-ink-secondary hover:bg-recessed border-transparent rounded-md',
      danger: 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20 rounded-md',
      outline: 'bg-transparent text-ink-primary hover:bg-recessed border-border hover:border-ink-primary asymmetric-b',
    };

    const sizes = {
      sm: 'h-10 px-4 text-[10px]',
      md: 'h-12 px-6 text-[11px]',
      lg: 'h-14 px-8 text-xs',
      icon: 'h-12 w-12 p-0',
    };

    const content = isLoading ? (
      <>
        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        {asChild ? <Slottable>{children}</Slottable> : children}
      </>
    ) : asChild ? <Slottable>{children}</Slottable> : children;

    return (
      <Component
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center font-black uppercase tracking-widest transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 disabled:cursor-not-allowed border active:scale-[0.98] touch-target',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {content}
      </Component>
    );
  }
);

Button.displayName = 'Button';

export { Button };

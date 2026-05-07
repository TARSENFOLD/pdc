import { forwardRef, type ReactNode, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';

export interface QuietButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant: 'primary' | 'secondary' | 'ghost' | 'hero';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  asChild?: boolean;
  'data-testid'?: string;
}

const VARIANTS = {
  // Primitivos calmos usam radii simétricos (--radius-md)
  primary: 'bg-accent text-ink-on-accent hover:bg-accent-soft border-transparent shadow-sm rounded-[10px]',
  secondary: 'bg-elevated text-ink-primary hover:bg-recessed border-ink-tertiary/10 rounded-[10px]',
  ghost: 'bg-transparent text-ink-secondary hover:bg-recessed border-transparent rounded-[10px]',
  // hero aplica raio assimétrico canónico conforme spec 05 §138 e §4.3
  hero: 'bg-accent-terracotta text-white hover:bg-accent-terracotta-soft border-transparent shadow-md rounded-[18px_6px_18px_6px]',
} as const;

const SIZES = {
  sm: 'h-11 px-4 text-xs gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-14 px-8 text-base gap-2.5',
} as const;

const QuietButton = forwardRef<HTMLButtonElement, QuietButtonProps>(
  (
    {
      variant,
      size = 'md',
      isLoading,
      iconLeft,
      iconRight,
      asChild = false,
      className,
      disabled,
      children,
      'data-testid': testId,
      ...props
    },
    ref,
  ) => {
    const Component = asChild ? Slot : 'button';

    return (
      <Component
        ref={ref}
        data-testid={testId}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center font-semibold transition-all',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-terracotta',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'border active:scale-[0.98] touch-target',
          VARIANTS[variant],
          SIZES[size],
          className,
        )}
        {...props}
      >
        {isLoading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <>
            {iconLeft}
            {children}
            {iconRight}
          </>
        )}
      </Component>
    );
  },
);

QuietButton.displayName = 'QuietButton';

export default QuietButton;

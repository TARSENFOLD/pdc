import { forwardRef } from 'react';
import { Button, type ButtonProps } from './Button';
import { cn } from '@/lib/utils';

/**
 * AsymmetricButton — CTA de Autoridade.
 * Radii: --radius-asym-a (TL+BR rounded, TR+BL square).
 * Epic 05: Reservado para momentos de autoridade (máx. 1 por viewport).
 */
export const AsymmetricButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        className={cn(
          'asymmetric-a font-bold tracking-tight',
          className
        )}
        {...props}
      />
    );
  }
);

AsymmetricButton.displayName = 'AsymmetricButton';

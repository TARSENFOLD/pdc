import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

export interface BentoTileProps {
  children: ReactNode;
  className?: string;
  size?: '1x1' | '2x1' | '1x2' | '2x2';
  asymmetric?: boolean;
}

/**
 * BentoGrid — Layout de tiles para Dashboards Role-Aware.
 * Respeita o gap de 24px (--space-6) definido na Epic 05.
 */
export function BentoGrid({ children, className }: BentoGridProps) {
  return (
    <div className={cn(
      'grid grid-cols-1 md:grid-cols-4 auto-rows-[180px] gap-6',
      className
    )}>
      {children}
    </div>
  );
}

/**
 * BentoTile — Unidade individual do BentoGrid.
 * Suporta tamanhos variados e a regra da assimetria para momentos de autoridade.
 */
export function BentoTile({ children, className, size = '1x1', asymmetric = false }: BentoTileProps) {
  const sizeClasses = {
    '1x1': 'col-span-1 row-span-1',
    '2x1': 'col-span-2 row-span-1',
    '1x2': 'col-span-1 row-span-2',
    '2x2': 'col-span-2 row-span-2',
  };

  return (
    <div className={cn(
      'bg-elevated border border-ink-tertiary/10 p-6 shadow-sm flex flex-col transition-all duration-300 hover:shadow-md',
      sizeClasses[size],
      asymmetric ? 'asymmetric-a rounded-lg' : 'rounded-lg',
      className
    )}>
      {children}
    </div>
  );
}

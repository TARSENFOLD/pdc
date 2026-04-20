import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { Card } from './Card';

export interface AspirationalEmptyProps {
  icon: LucideIcon;
  title: string;
  description: string;
  children?: ReactNode;
  className?: string;
}

/**
 * AspirationalEmpty — Empty States com Promessa.
 * Epic 05: Nunca dizer apenas "Sem dados", mas sim o que virá depois.
 */
export function AspirationalEmpty({
  icon: Icon,
  title,
  description,
  children,
  className
}: AspirationalEmptyProps) {
  return (
    <Card className={cn(
      'flex flex-col items-center justify-center text-center p-12 bg-recessed border-dashed border-ink-tertiary/20 opacity-80 rounded-2xl',
      className
    )}>
      <div className="h-16 w-16 rounded-[24px] bg-accent/5 flex items-center justify-center text-accent mb-6">
        <Icon size={32} />
      </div>
      
      <div className="max-w-xs space-y-2">
        <h3 className="font-display text-xl font-bold text-ink-primary tracking-tight">
          {title}
        </h3>
        <p className="text-sm text-ink-secondary leading-relaxed">
          {description}
        </p>
      </div>

      {children && (
        <div className="mt-8">
          {children}
        </div>
      )}
    </Card>
  );
}

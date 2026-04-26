import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { Card } from './Card';

export interface AspirationalEmptyProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/**
 * AspirationalEmpty — Estado vazio premium que inspira ação.
 * Cumpre o rigor "Soul & Elite" (Spec 05).
 */
export function AspirationalEmpty({ 
  icon: Icon, 
  title, 
  description, 
  action,
  children, 
  className 
}: AspirationalEmptyProps) {
  return (
    <Card className={cn("flex flex-col items-center text-center p-12 border-ink-tertiary/10 bg-elevated/30 backdrop-blur-md", className)}>
      <div className="p-4 rounded-full bg-accent/5 text-accent mb-6 animate-pulse">
        <Icon size={40} strokeWidth={1.5} />
      </div>
      
      <div className="max-w-md space-y-2">
        <h3 className="font-display text-2xl font-black tracking-tight text-ink-primary">
          {title}
        </h3>
        <p className="text-sm text-ink-secondary leading-relaxed">
          {description}
        </p>
      </div>

      {(action || children) && (
        <div className="mt-8 flex flex-col items-center gap-4">
          {action}
          {children}
        </div>
      )}
    </Card>
  );
}

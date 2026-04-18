import { LucideIcon } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaTo?: string;
  variant?: 'default' | 'error';
  onRetry?: () => void;
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  ctaLabel, 
  ctaTo,
  variant = 'default',
  onRetry
}: EmptyStateProps) {
  return (
    <Card className={`p-20 text-center space-y-6 flex flex-col items-center border-dashed ${variant === 'error' ? 'border-error/20 bg-error/[0.02]' : 'border-white/10 bg-white/[0.01]'}`}>
      <div className={`h-20 w-20 rounded-[32px] flex items-center justify-center ${variant === 'error' ? 'bg-error/10 text-error' : 'bg-accent/5 text-accent'}`}>
        <Icon size={40} />
      </div>
      <div className="space-y-2 max-w-sm">
        <h3 className="text-xl font-black text-text-primary tracking-tight uppercase">{title}</h3>
        <p className="text-sm text-text-secondary leading-relaxed">{description}</p>
      </div>
      
      <div className="flex gap-4">
        {ctaLabel && ctaTo && (
          <Button asChild className="px-8 rounded-2xl bg-accent text-white font-black uppercase tracking-widest text-[10px]">
            <a href={ctaTo}>{ctaLabel}</a>
          </Button>
        )}
        
        {onRetry && (
          <Button variant="secondary" onClick={onRetry} className="px-8 rounded-2xl font-black uppercase tracking-widest text-[10px]">
            Tentar Novamente
          </Button>
        )}
      </div>
    </Card>
  );
}

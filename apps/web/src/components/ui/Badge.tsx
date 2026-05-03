import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant =
  | 'default'
  | 'outline'
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'accent'
  | 'admin'
  | 'mentor'
  | 'estudante'
  | 'instituicao'
  | 'moderador'
  | 'comite_cientifico'
  | 'super_admin'
  | 'patrocinador'
  | 'secondary';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant | undefined;
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants: Record<BadgeVariant, string> = {
      default: 'bg-recessed text-ink-primary border-border',
      outline: 'bg-transparent text-ink-secondary border-border',
      success: 'bg-accent-success/5 text-accent-success border-accent-success/10',
      error: 'bg-accent-danger/5 text-accent-danger border-accent-danger/10',
      warning: 'bg-orange-500/5 text-orange-400 border-orange-500/10',
      info: 'bg-blue-500/5 text-blue-400 border-blue-500/10',
      accent: 'bg-accent/5 text-accent border-accent/10',
      secondary: 'bg-institutional-cobalt/5 text-institutional-cobalt border-institutional-cobalt/10',
      admin: 'bg-purple-500/5 text-purple-400 border-purple-500/10',
      mentor: 'bg-blue-500/5 text-blue-400 border-blue-500/10',
      estudante: 'bg-accent/5 text-accent border-accent/10',
      instituicao: 'bg-institutional-cobalt/5 text-institutional-cobalt border-institutional-cobalt/10',
      moderador: 'bg-orange-500/5 text-orange-400 border-orange-500/10',
      comite_cientifico: 'bg-purple-500/5 text-purple-400 border-purple-500/10',
      super_admin: 'bg-red-500/5 text-red-400 border-red-500/10',
      patrocinador: 'bg-yellow-500/5 text-yellow-400 border-yellow-500/10',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border transition-colors',
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };

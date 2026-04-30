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
      default: 'bg-recessed text-ink-primary border-white/5',
      outline: 'bg-transparent text-ink-secondary border-white/10',
      success: 'bg-accent-success/10 text-accent-success border-accent-success/20',
      error: 'bg-accent-danger/10 text-accent-danger border-accent-danger/20',
      warning: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      accent: 'bg-accent/10 text-accent border-accent/20',
      secondary: 'bg-institutional-cobalt/10 text-institutional-cobalt border-institutional-cobalt/20',
      admin: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      mentor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      estudante: 'bg-accent/10 text-accent border-accent/20',
      instituicao: 'bg-institutional-cobalt/10 text-institutional-cobalt border-institutional-cobalt/20',
      moderador: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      comite_cientifico: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      super_admin: 'bg-red-500/10 text-red-400 border-red-500/20',
      patrocinador: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border transition-colors',
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

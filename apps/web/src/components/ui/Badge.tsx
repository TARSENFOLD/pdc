import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant =
  | 'default'
  | 'outline'
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'admin'
  | 'mentor'
  | 'estudante'
  | 'instituicao'
  | 'moderador'
  | 'comite_cientifico'
  | 'super_admin'
  | 'estudante'
  | 'patrocinador'
  | 'secondary';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants: Record<BadgeVariant, string> = {
      default: 'bg-recessed text-ink-primary border-ink-tertiary/20',
      outline: 'bg-transparent text-ink-secondary border-ink-tertiary/20',
      success: 'bg-green-500/10 text-green-600 border-green-500/20',
      error: 'bg-red-500/10 text-red-600 border-red-500/20',
      warning: 'bg-accent/10 text-accent border-accent/20',
      info: 'bg-cobalt/10 text-cobalt border-cobalt/20',
      admin: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
      mentor: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
      estudante: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      instituicao: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
      moderador: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
      comite_cientifico: 'bg-cobalt/10 text-cobalt border-cobalt/20',
      super_admin: 'bg-red-500/10 text-red-600 border-red-500/20',
      estudante: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      patrocinador: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      secondary: 'bg-recessed text-ink-secondary border-ink-tertiary/10',
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

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
  | 'aluno'
  | 'instituicao'
  | 'moderador'
  | 'comite_cientifico'
  | 'super_admin';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants: Record<BadgeVariant, string> = {
      default: 'bg-surface-raised text-text-primary border-border',
      outline: 'bg-transparent text-text-secondary border-border',
      success: 'bg-success/10 text-success border-success/20',
      error: 'bg-error/10 text-error border-error/20',
      warning: 'bg-amber/10 text-amber border-amber/20',
      info: 'bg-info/10 text-info border-info/20',
      admin: 'bg-role-admin/10 text-role-admin border-role-admin/20',
      mentor: 'bg-role-mentor/10 text-role-mentor border-role-mentor/20',
      aluno: 'bg-role-aluno/10 text-role-aluno border-role-aluno/20',
      instituicao: 'bg-role-instituicao/10 text-role-instituicao border-role-instituicao/20',
      moderador: 'bg-role-moderador/10 text-role-moderador border-role-moderador/20',
      comite_cientifico: 'bg-info/10 text-info border-info/20',
      super_admin: 'bg-error/10 text-error border-error/20',
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

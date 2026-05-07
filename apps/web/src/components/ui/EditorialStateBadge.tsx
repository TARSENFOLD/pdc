import { cn } from '@/lib/utils';
import type { EstadoEditorial, ProjetoEstado } from '@pdc/shared';

type EditorialState = EstadoEditorial | ProjetoEstado;

interface EditorialStateBadgeProps {
  state: EditorialState;
  className?: string;
}

const STATE_CONFIG: Record<EditorialState, { label: string; className: string }> = {
  draft: { label: 'Rascunho', className: 'bg-ink-tertiary/10 text-ink-tertiary' },
  review: { label: 'Pendente', className: 'bg-warning/10 text-warning' },
  approved: { label: 'Aprovado', className: 'bg-success/10 text-success' },
  published: { label: 'Publicado', className: 'bg-success/10 text-success' },
  rejected: { label: 'Rejeitado', className: 'bg-error/10 text-error' },
  archived: { label: 'Arquivado', className: 'bg-ink-tertiary/5 text-ink-tertiary' },
};

export function EditorialStateBadge({ state, className }: EditorialStateBadgeProps) {
  const config = STATE_CONFIG[state];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}

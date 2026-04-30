import { cn } from '@/lib/utils';

type EditorialState =
  | 'rascunho'
  | 'pendente'
  | 'publicado'
  | 'rejeitado'
  | 'arquivado'
  | 'draft'
  | 'review'
  | 'approved'
  | 'published'
  | 'rejected'
  | 'archived';

interface EditorialStateBadgeProps {
  state: string;
  className?: string;
}

const STATE_CONFIG: Record<EditorialState, { label: string; className: string }> = {
  rascunho: { label: 'Rascunho', className: 'bg-ink-tertiary/10 text-ink-tertiary' },
  pendente: { label: 'Pendente', className: 'bg-yellow-500/10 text-yellow-600' },
  publicado: { label: 'Publicado', className: 'bg-success/10 text-success' },
  rejeitado: { label: 'Rejeitado', className: 'bg-red-500/10 text-red-500' },
  arquivado: { label: 'Arquivado', className: 'bg-ink-tertiary/5 text-ink-tertiary' },
  draft: { label: 'Rascunho', className: 'bg-ink-tertiary/10 text-ink-tertiary' },
  review: { label: 'Pendente', className: 'bg-yellow-500/10 text-yellow-600' },
  approved: { label: 'Aprovado', className: 'bg-success/10 text-success' },
  published: { label: 'Publicado', className: 'bg-success/10 text-success' },
  rejected: { label: 'Rejeitado', className: 'bg-red-500/10 text-red-500' },
  archived: { label: 'Arquivado', className: 'bg-ink-tertiary/5 text-ink-tertiary' },
};

function isEditorialState(state: string): state is EditorialState {
  return state in STATE_CONFIG;
}

export function EditorialStateBadge({ state, className }: EditorialStateBadgeProps) {
  const config = isEditorialState(state) ? STATE_CONFIG[state] : STATE_CONFIG.rascunho;
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

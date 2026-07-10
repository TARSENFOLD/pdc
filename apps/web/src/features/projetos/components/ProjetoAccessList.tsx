import type { PedidoAcesso } from '@pdc/shared';
import { Check, Clock3, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui';

interface ProjetoAccessListProps {
  entries: PedidoAcesso[];
  pendingPedidoId?: string | undefined;
  isDeciding?: (pedidoId: string) => boolean;
  onDecision: (pedidoId: string, status: 'aprovado' | 'rejeitado') => void;
}

function getPerfilLabel(entry: PedidoAcesso): string {
  return entry.perfilSolicitante?.nome ?? `Perfil ${entry.perfilSolicitante?.id ?? 'desconhecido'}`;
}

export function ProjetoAccessList({ entries, pendingPedidoId, isDeciding, onDecision }: ProjetoAccessListProps): React.JSX.Element {
  if (entries.length === 0) {
    return <p className="border-y border-border py-8 text-sm text-ink-tertiary">Ainda não existem pedidos de acesso.</p>;
  }

  return (
    <div className="divide-y divide-border border-y border-border">
      {entries.map((entry) => (
        <div key={entry.id} className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-recessed text-ink-secondary">
              {entry.status === 'aprovado' ? <ShieldCheck size={17} /> : entry.status === 'rejeitado' ? <X size={17} /> : <Clock3 size={17} />}
            </span>
            <div>
              <p className="text-sm font-semibold text-ink-primary">{getPerfilLabel(entry)}</p>
              <p className="text-xs text-ink-tertiary">
                {entry.status === 'pendente' ? 'A aguardar decisão' : entry.status === 'aprovado' ? 'Acesso concedido' : 'Pedido recusado'}
              </p>
              {entry.motivo && <p className="mt-1 max-w-xl text-xs text-ink-secondary">“{entry.motivo}”</p>}
            </div>
          </div>
          <div className="flex gap-2">
            {entry.status === 'pendente' && (
              <>
                <Button size="sm" variant="outline" disabled={pendingPedidoId === entry.id || isDeciding?.(entry.id)} onClick={() => { onDecision(entry.id, 'aprovado'); }}>
                  <Check size={14} /> Aprovar
                </Button>
                <Button size="sm" variant="ghost" disabled={pendingPedidoId === entry.id || isDeciding?.(entry.id)} onClick={() => { onDecision(entry.id, 'rejeitado'); }}>
                  <X size={14} /> Recusar
                </Button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

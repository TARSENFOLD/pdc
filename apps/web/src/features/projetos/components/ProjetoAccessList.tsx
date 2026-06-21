import type { ACLEntry } from '@pdc/shared';
import { Check, Clock3, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui';

interface ProjetoAccessListProps {
  entries: ACLEntry[];
  pendingPerfilId?: string | undefined;
  onDecision: (perfilId: string, action: 'aprovar' | 'rejeitar' | 'remover') => void;
}

export function ProjetoAccessList({ entries, pendingPerfilId, onDecision }: ProjetoAccessListProps): React.JSX.Element {
  if (entries.length === 0) {
    return <p className="border-y border-border py-8 text-sm text-ink-tertiary">Ainda não existem pedidos de acesso.</p>;
  }

  return (
    <div className="divide-y divide-border border-y border-border">
      {entries.map((entry) => (
        <div key={entry.perfilId} className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-recessed text-ink-secondary">
              {entry.estado === 'aprovado' ? <ShieldCheck size={17} /> : <Clock3 size={17} />}
            </span>
            <div>
              <p className="text-sm font-semibold text-ink-primary">Perfil {entry.perfilId}</p>
              <p className="text-xs text-ink-tertiary">
                {entry.estado === 'pendente' ? 'A aguardar decisão' : entry.estado === 'aprovado' ? 'Acesso concedido' : 'Pedido recusado'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {entry.estado === 'pendente' && (
              <>
                <Button size="sm" variant="outline" disabled={pendingPerfilId === entry.perfilId} onClick={() => { onDecision(entry.perfilId, 'aprovar'); }}>
                  <Check size={14} /> Aprovar
                </Button>
                <Button size="sm" variant="ghost" disabled={pendingPerfilId === entry.perfilId} onClick={() => { onDecision(entry.perfilId, 'rejeitar'); }}>
                  <X size={14} /> Recusar
                </Button>
              </>
            )}
            {entry.estado === 'aprovado' && (
              <Button size="sm" variant="ghost" disabled={pendingPerfilId === entry.perfilId} onClick={() => { onDecision(entry.perfilId, 'remover'); }}>
                Remover acesso
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

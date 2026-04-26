import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { Spinner, Table, Pagination, Badge } from '@/components/ui';

interface EventoTelemetria {
  id: string;
  tipo: string;
  timestamp: string;
  user?: string;
  payload?: unknown;
}

interface TelemetriaResponse {
  data: EventoTelemetria[];
  meta?: {
    pagination?: {
      pageCount?: number;
    };
  };
}

export function AdminTelemetriaPage() {
  const [page, setPage] = useState(1);
  const [tipo, setTipo] = useState('');

  const { data, isLoading } = useQuery<TelemetriaResponse>({
    queryKey: ['admin', 'telemetria', page, tipo],
    queryFn: () => adminApi.getTelemetria({ tipo, page, pageSize: 15 }),
  });

  const columns = [
    { header: 'Tipo', accessor: (e: EventoTelemetria) => <Badge variant="outline">{e.tipo}</Badge> },
    { header: 'Utilizador', accessor: (e: EventoTelemetria) => <span className="text-xs font-mono text-text-secondary">{e.user ?? '-'}</span> },
    { header: 'Data/Hora', accessor: (e: EventoTelemetria) => <span className="text-xs text-text-secondary">{new Date(e.timestamp).toLocaleString()}</span> },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Telemetria</h1>
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Filtrar por tipo (ex: simulacao.completed)"
          value={tipo}
          onChange={(e) => { setTipo(e.target.value); setPage(1); }}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-amber w-80"
        />
      </div>
      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (data?.data ?? []).length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface-raised p-8 text-center">
          <p className="text-text-secondary">Ainda não há eventos de telemetria registados.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <Table columns={columns} data={data?.data ?? []} />
          {(data?.meta?.pagination?.pageCount ?? 0) > 1 && (
            <Pagination page={page} pageCount={data?.meta?.pagination?.pageCount ?? 1} onPageChange={setPage} />
          )}
        </div>
      )}
    </div>
  );
}

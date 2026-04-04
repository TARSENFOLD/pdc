import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { Spinner, Table, Pagination, Avatar } from '@/components/ui';
import type { AuditLog } from '@pdc/shared';

export function AdminAuditPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'audit', page],
    queryFn: () => adminApi.getAudit({ page, pageSize: 15 }),
  });

  const columns = [
    { 
      header: 'Utilizador', 
      accessor: (log: AuditLog) => (
        <div className="flex items-center gap-2">
          <Avatar name={log.userId} size="sm" className="h-6 w-6" />
          <span className="text-xs font-mono text-text-secondary">{log.userId.substring(0, 8)}…</span>
        </div>
      )
    },
    { 
      header: 'Ação', 
      accessor: (log: AuditLog) => (
        <span className="font-medium text-xs">{log.accao.replace(/_/g, ' ')}</span>
      )
    },
    { 
      header: 'Recurso', 
      accessor: (log: AuditLog) => (
        <div className="flex flex-col">
          <span className="text-xs text-text-primary">{log.recurso}</span>
          {log.recursoId && <span className="text-[10px] text-text-secondary font-mono">#{log.recursoId.substring(0, 8)}</span>}
        </div>
      )
    },
    { 
      header: 'IP', 
      accessor: (log: AuditLog) => (
        <span className="text-xs text-text-secondary font-mono">{log.ip}</span>
      )
    },
    { 
      header: 'Data/Hora', 
      accessor: (log: AuditLog) => (
        <span className="text-xs text-text-secondary">{new Date(log.timestamp).toLocaleString()}</span>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Registos de Auditoria</h1>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="space-y-6">
          <Table columns={columns} data={data?.data ?? []} />
          {data?.pagination && data.pagination.pageCount > 1 && (
            <Pagination 
              page={page} 
              pageCount={data.pagination.pageCount} 
              onPageChange={setPage} 
            />
          )}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { Spinner, Tabela, Pagination, Avatar } from '@/components/ui';

export function AdminAuditPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'audit', page],
    queryFn: () => adminApi.getAudit({ page, pageSize: 15 }),
  });

  const columns = [
    { 
      header: 'Utilizador', 
      accessor: 'userId' as const,
      cell: (v: string, row: any) => (
        <div className="flex items-center gap-2">
          <Avatar name={v} size="xs" />
          <span className="text-xs font-mono">{v.substring(0, 8)}…</span>
        </div>
      )
    },
    { header: 'Ação', accessor: 'accao' as const },
    { 
      header: 'Recurso', 
      accessor: 'recurso' as const,
      cell: (v: string, row: any) => (
        <span className="text-xs text-text-muted">
          {v} {row.recursoId && `(#${row.recursoId.substring(0, 8)})`}
        </span>
      )
    },
    { header: 'IP', accessor: 'ip' as const, cell: (v: string) => <span className="text-xs text-text-muted font-mono">{v}</span> },
    { header: 'Data', accessor: 'timestamp' as const, cell: (v: string) => new Date(v).toLocaleString() },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-6">Logs de Auditoria</h1>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          <Tabela columns={columns} data={data?.data ?? []} />
          {data?.pagination?.pageCount > 1 && (
            <Pagination 
              page={page} 
              pageCount={data.pagination.pageCount} 
              onPageChange={setPage} 
              className="mt-6" 
            />
          )}
        </>
      )}
    </div>
  );
}

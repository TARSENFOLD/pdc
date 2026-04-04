import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { denunciasApi } from '@/lib/api/denuncias';
import { Spinner, Table, Badge, Pagination } from '@/components/ui';
import type { Denuncia, DenunciaEstado } from '@pdc/shared';

export function DenunciaListPage() {
  const [page, setPage] = useState(1);
  const [estado, setEstado] = useState<DenunciaEstado | ''>('');
  const [tipo, setTipo] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['denuncias', page, estado, tipo],
    queryFn: () => denunciasApi.list({ 
      page, 
      pageSize: 10, 
      ...(estado ? { estado } : {}),
      ...(tipo ? { tipo } : {})
    }),
  });

  const columns = [
    { header: 'Tipo', accessor: (d: Denuncia) => d.conteudoTipo },
    { header: 'Motivo', accessor: (d: Denuncia) => <span className="line-clamp-1">{d.motivo}</span> },
    { 
      header: 'Estado', 
      accessor: (d: Denuncia) => (
        <Badge variant={d.estado === 'pendente' ? 'warning' : d.estado === 'resolvida' ? 'success' : 'info'}>
          {d.estado.replace('_', ' ')}
        </Badge>
      ) 
    },
    { header: 'Data', accessor: (d: Denuncia) => new Date(d.criadaEm).toLocaleDateString() },
    {
      header: 'Ações',
      accessor: (d: Denuncia) => (
        <Link to={`/app/moderacao/denuncias/${d.id}`} className="text-amber hover:underline font-medium">
          Ver
        </Link>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Moderação de Denúncias</h1>
        <div className="flex gap-2">
          <select
            value={estado}
            onChange={(e) => { setEstado(e.target.value as DenunciaEstado | ''); setPage(1); }}
            className="h-9 rounded-md border border-border bg-surface-raised px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-amber"
          >
            <option value="">Todos estados</option>
            <option value="pendente">Pendente</option>
            <option value="em_analise">Em análise</option>
            <option value="resolvida">Resolvida</option>
          </select>
          <select
            value={tipo}
            onChange={(e) => { setTipo(e.target.value); setPage(1); }}
            className="h-9 rounded-md border border-border bg-surface-raised px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-amber"
          >
            <option value="">Todos tipos</option>
            <option value="projeto">Projeto</option>
            <option value="perfil">Perfil</option>
            <option value="curso">Curso</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          <Table columns={columns} data={data?.data ?? []} />
          {data?.pagination && data.pagination.pageCount > 1 && (
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

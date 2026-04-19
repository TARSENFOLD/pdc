import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Spinner, Table, Pagination, Avatar, Button, Badge } from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import { http } from '@/lib/api/http';
import type { User } from '@pdc/shared';

interface UtilizadoresResponse {
  data: User[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };
}

export function ModeradorUtilizadoresPage() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'utilizadores', page],
    queryFn: () =>
      http.get<UtilizadoresResponse>(`/admin/utilizadores?page=${page.toString()}&pageSize=10`),
  });

  const suspendMutation = useMutation({
    mutationFn: (id: string) =>
      http.put<{ success: boolean }>(`/admin/utilizadores/${id}/suspender`, {}),
    onSuccess: () => {
      toast({ title: 'Utilizador suspenso', description: 'O acesso do utilizador foi bloqueado.' });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'utilizadores'] });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Nao foi possivel suspender o utilizador.' });
    }
  });

  const columns = [
    {
      header: 'Utilizador',
      accessor: (u: User) => (
        <div className="flex items-center gap-3">
          <Avatar
            fallback={u.nome.substring(0, 2).toUpperCase()}
            {...(u.avatarUrl ? { src: u.avatarUrl } : {})}
            size="sm"
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{u.nome}</p>
            <p className="text-xs text-text-secondary truncate">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Role',
      accessor: (u: User) => (
        <Badge variant={u.role}>{u.role.replace('_', ' ')}</Badge>
      ),
    },
    {
      header: 'Acoes',
      accessor: (u: User) => (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => { window.location.href = `/perfis/${u.id}`; }}
            className="h-8 px-2 text-xs"
          >
            Ver Perfil
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              if (confirm(`Suspender ${u.nome}? O utilizador nao podera aceder a plataforma.`)) {
                suspendMutation.mutate(u.id);
              }
            }}
            isLoading={suspendMutation.isPending && suspendMutation.variables === u.id}
            className="h-8 px-2 text-xs"
          >
            Suspender
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Gestao de Utilizadores</h1>

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

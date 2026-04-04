import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { Spinner, Tabela, Badge, Pagination, Avatar, Button, Modal } from '@/components/ui';
import type { Role } from '@pdc/shared';

export function AdminUtilizadoresPage() {
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<{ id: string; nome: string; role: Role } | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', page],
    queryFn: () => adminApi.getUtilizadores({ page, pageSize: 10 }),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) => adminApi.updateRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setIsRoleModalOpen(false);
    },
  });

  const suspendMutation = useMutation({
    mutationFn: (id: string) => adminApi.suspender(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  const columns = [
    { 
      header: 'Utilizador', 
      accessor: 'nome' as const,
      cell: (v: string, row: any) => (
        <div className="flex items-center gap-3">
          <Avatar name={v} src={row.avatarUrl} size="sm" />
          <div>
            <p className="text-sm font-medium text-text-primary">{v}</p>
            <p className="text-xs text-text-muted">{row.email}</p>
          </div>
        </div>
      )
    },
    { 
      header: 'Role', 
      accessor: 'role' as const,
      cell: (v: string) => <Badge variant="secondary">{v}</Badge>
    },
    {
      header: 'Ações',
      accessor: 'id' as const,
      cell: (id: string, row: any) => (
        <div className="flex gap-2">
          <Button 
            variant="secondary" 
            size="xs" 
            onClick={() => { setSelectedUser(row); setIsRoleModalOpen(true); }}
          >
            Alterar Role
          </Button>
          <Button 
            variant="outline" 
            size="xs" 
            className="text-error border-error hover:bg-error/10"
            onClick={() => { if(confirm('Suspender utilizador?')) suspendMutation.mutate(id); }}
            isLoading={suspendMutation.isPending && suspendMutation.variables === id}
          >
            Suspender
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-6">Utilizadores</h1>

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

      {selectedUser && (
        <Modal 
          isOpen={isRoleModalOpen} 
          onClose={() => setIsRoleModalOpen(false)}
          title={`Alterar role de ${selectedUser.nome}`}
        >
          <div className="p-4 space-y-4">
            <select
              defaultValue={selectedUser.role}
              onChange={(e) => roleMutation.mutate({ id: selectedUser.id, role: e.target.value as Role })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-amber"
            >
              <option value="aluno">Aluno</option>
              <option value="mentor">Mentor</option>
              <option value="instituicao">Instituição</option>
              <option value="moderador">Moderador</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
        </Modal>
      )}
    </div>
  );
}

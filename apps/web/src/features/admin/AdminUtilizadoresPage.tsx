import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { Spinner, Table, Badge, Pagination, Avatar, Button, Modal, ModalHeader, ModalTitle, ModalFooter } from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import type { Role, User } from '@pdc/shared';

export function AdminUtilizadoresPage() {
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', page],
    queryFn: () => adminApi.getUtilizadores({ page, pageSize: 10 }),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) => adminApi.updateRole(id, role),
    onSuccess: () => {
      toast({ title: 'Role atualizada', description: 'A permissão do utilizador foi alterada.' });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setIsRoleModalOpen(false);
      setSelectedUser(null);
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível alterar a role.' });
    }
  });

  const suspendMutation = useMutation({
    mutationFn: (id: string) => adminApi.suspender(id),
    onSuccess: () => {
      toast({ title: 'Utilizador suspenso', description: 'O acesso do utilizador foi bloqueado.' });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível suspender o utilizador.' });
    }
  });

  const reativarMutation = useMutation({
    mutationFn: (id: string) => adminApi.reativar(id),
    onSuccess: () => {
      toast({ title: 'Utilizador reativado', description: 'O acesso do utilizador foi restaurado.' });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível reativar o utilizador.' });
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
      )
    },
    { 
      header: 'Role', 
      accessor: (u: User) => (
        <Badge variant={u.role}>{u.role.replace('_', ' ')}</Badge>
      )
    },
    {
      header: 'Ações',
      accessor: (u: User) => (
        <div className="flex gap-2">
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => { setSelectedUser(u); setIsRoleModalOpen(true); }}
            className="h-8 px-2 text-xs"
          >
            Alterar Role
          </Button>
          <Button 
            variant="danger" 
            size="sm" 
            onClick={() => { if(confirm(`Suspender ${u.nome}?`)) suspendMutation.mutate(u.id); }}
            isLoading={suspendMutation.isPending && suspendMutation.variables === u.id}
            className="h-8 px-2 text-xs"
          >
            Suspender
          </Button>
          {(u as Record<string, unknown>).bloqueado === true ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { reativarMutation.mutate(u.id); }}
              isLoading={reativarMutation.isPending && reativarMutation.variables === u.id}
              className="h-8 px-2 text-xs"
            >
              Reativar
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Gestão de Utilizadores</h1>

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

      <Modal 
        open={isRoleModalOpen} 
        onOpenChange={(open) => {
          setIsRoleModalOpen(open);
          if (!open) setSelectedUser(null);
        }}
      >
        <ModalHeader>
          <ModalTitle>Alterar role de {selectedUser?.nome}</ModalTitle>
        </ModalHeader>
        
        <div className="py-6">
          <label className="text-sm font-medium text-text-secondary block mb-2">Selecione a nova função</label>
          <select
            defaultValue={selectedUser?.role}
            onChange={(e) => {
              if (selectedUser) {
                roleMutation.mutate({ id: selectedUser.id, role: e.target.value as Role });
              }
            }}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-amber"
          >
            <option value="estudante">Estudante</option>
            <option value="mentor">Mentor</option>
            <option value="instituicao">Instituição</option>
            <option value="moderador">Moderador</option>
            <option value="comite_cientifico">Comité Científico</option>
            <option value="super_admin">Super Admin</option>
          </select>
        </div>

        <ModalFooter>
          <Button variant="ghost" onClick={() => { setIsRoleModalOpen(false); }}>Cancelar</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

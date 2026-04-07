import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { Card, Spinner } from '@/components/ui';
import { Link } from 'react-router-dom';

export function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi.getStats(),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Painel de Administração</h1>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6 bg-surface-raised border-border">
          <p className="text-sm font-medium text-text-secondary">Utilizadores</p>
          <p className="mt-2 text-3xl font-bold text-amber">{stats?.totalUtilizadores ?? 0}</p>
        </Card>
        <Card className="p-6 bg-surface-raised border-border">
          <p className="text-sm font-medium text-text-secondary">Simulações</p>
          <p className="mt-2 text-3xl font-bold text-amber">{stats?.totalSimulacoes ?? 0}</p>
        </Card>
        <Card className="p-6 bg-surface-raised border-border">
          <p className="text-sm font-medium text-text-secondary">Cursos</p>
          <p className="mt-2 text-3xl font-bold text-amber">{stats?.totalCursos ?? 0}</p>
        </Card>
        <Card className="p-6 bg-surface-raised border-border">
          <p className="text-sm font-medium text-text-secondary">Denúncias Pendentes</p>
          <p className="mt-2 text-3xl font-bold text-error">{stats?.denunciasPendentes ?? 0}</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-semibold text-text-primary mb-4">Ações Rápidas</h2>
          <div className="flex flex-wrap gap-3">
            <Link 
              to="/app/admin/utilizadores"
              className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium text-text-primary hover:bg-surface-raised transition-colors"
            >
              Gerir Utilizadores
            </Link>
            <Link 
              to="/app/admin/audit"
              className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium text-text-primary hover:bg-surface-raised transition-colors"
            >
              Ver Auditoria
            </Link>
            <Link 
              to="/app/admin/stats"
              className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium text-text-primary hover:bg-surface-raised transition-colors"
            >
              Estatísticas Detalhadas
            </Link>
            <Link to="/app/admin/telemetria" className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium text-text-primary hover:bg-surface-raised transition-colors">
              Telemetria
            </Link>
            <Link to="/app/admin/relatorios" className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium text-text-primary hover:bg-surface-raised transition-colors">
              Relatórios
            </Link>
            <Link to="/app/moderacao/aprovacoes" className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium text-text-primary hover:bg-surface-raised transition-colors">
              Fila de Aprovação
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

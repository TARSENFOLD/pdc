import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { Spinner, Card } from '@/components/ui';

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-6">
      <p className="text-sm font-medium text-text-secondary">{label}</p>
      <p className="mt-2 text-3xl font-bold text-amber">{value.toLocaleString()}</p>
    </Card>
  );
}

export function AdminStatsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi.getStats(),
  });

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  const stats = data ?? { totalUtilizadores: 0, totalSimulacoes: 0, totalCursos: 0, denunciasPendentes: 0 };

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-8">Estatísticas Gerais</h1>
      
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Utilizadores" value={stats.totalUtilizadores} />
        <StatCard label="Simulações Realizadas" value={stats.totalSimulacoes} />
        <StatCard label="Cursos Ativos" value={stats.totalCursos} />
        <StatCard label="Denúncias Pendentes" value={stats.denunciasPendentes} />
      </div>
    </div>
  );
}

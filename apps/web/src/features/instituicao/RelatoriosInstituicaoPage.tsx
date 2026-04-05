import { useQuery } from '@tanstack/react-query';
import { experienciasApi } from '@/lib/api/experiencias';
import { Card, Table, Spinner, type Column } from '@/components/ui';
import type { ExperienciaMinha } from '@pdc/shared';

export function RelatoriosInstituicaoPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['experiencias', 'stats'],
    queryFn: () => experienciasApi.getStats(),
  });

  const { data: experiencias, isLoading: expLoading } = useQuery({
    queryKey: ['experiencias', 'minhas'],
    queryFn: () => experienciasApi.getMinhas(),
  });

  if (statsLoading || expLoading) return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>;

  const data = experiencias?.data ?? [];

  const columns: Column<ExperienciaMinha>[] = [
    { header: 'Experiência', accessor: 'titulo', className: 'font-medium' },
    { header: 'Área', accessor: (exp: ExperienciaMinha) => exp.area ?? 'N/A' },
    { header: 'Inscrições', accessor: (exp: ExperienciaMinha) => exp.inscricoesCount ?? 0 },
    { header: 'Vagas', accessor: (exp: ExperienciaMinha) => exp.vagas ?? 'Ilimitadas' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Relatórios e Métricas</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="text-sm font-medium text-text-secondary">Experiências Publicadas</div>
          <div className="text-2xl font-bold">{stats?.experienciasPublicadas ?? 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium text-text-secondary">Inscrições Totais</div>
          <div className="text-2xl font-bold">{stats?.inscricoesTotais ?? 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium text-text-secondary">Programas Ativos</div>
          <div className="text-2xl font-bold">{stats?.programasActivos ?? 0}</div>
        </Card>
      </div>

      <Card>
        <div className="p-4 font-bold border-b border-border">Métricas por Experiência</div>
        <Table columns={columns} data={data} />
      </Card>
    </div>
  );
}

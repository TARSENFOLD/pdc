import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { experienciasApi } from '@/lib/api/experiencias';
import { Card, Button, Table, Spinner, type Column } from '@/components/ui';
import { EditorialStateBadge } from '@/components/ui/EditorialStateBadge';
import type { ExperienciaMinha } from '@pdc/shared';

export function InstituicaoExperienciasPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['experiencias', 'minhas'],
    queryFn: () => experienciasApi.getMinhas(),
  });

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>;
  if (error) return <div className="text-red-500">Erro ao carregar experiências</div>;

  const experiencias = data?.data ?? [];

  const columns: Column<ExperienciaMinha>[] = [
    { header: 'Título', accessor: 'titulo', className: 'font-medium' },
    { 
      header: 'Estado', 
      accessor: (exp: ExperienciaMinha) => (
        <EditorialStateBadge state={exp.estado} />
      )
    },
    { header: 'Vagas', accessor: (exp: ExperienciaMinha) => exp.vagas ?? 'Ilimitadas' },
    { header: 'Inscrições', accessor: (exp: ExperienciaMinha) => exp.inscricoesCount ?? 0 },
    { 
      header: 'Ações', 
      accessor: (exp: ExperienciaMinha) => (
        <div className="flex gap-2">
          <Button asChild size="sm" variant="ghost">
            <Link to={`/app/instituicao/editar-experiencia/${exp.id}`}>Editar</Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link to={`/experiencias/${exp.id}`}>Ver</Link>
          </Button>
        </div>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Minhas Experiências</h1>
        <Button asChild>
          <Link to="/app/instituicao/criar-experiencia">Criar Experiência</Link>
        </Button>
      </div>

      <Card>
        {experiencias.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-4 text-center">
            <p className="text-muted-foreground">Ainda não criou nenhuma experiência.</p>
            <Button asChild variant="secondary">
              <Link to="/app/instituicao/criar-experiencia">Criar a primeira</Link>
            </Button>
          </div>
        ) : (
          <Table columns={columns} data={experiencias} />
        )}
      </Card>
    </div>
  );
}

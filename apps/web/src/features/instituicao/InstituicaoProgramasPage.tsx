import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { programasApi } from '@/lib/api/programas';
import { Card, Button, Table, Badge, Spinner, type Column } from '@/components/ui';
import type { Programa } from '@pdc/shared';

export function InstituicaoProgramasPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['programas', 'meus'],
    queryFn: () => programasApi.getMeus(),
  });

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>;
  if (error) return <div className="text-error">Erro ao carregar programas</div>;

  const programas = data?.data ?? [];

  const columns: Column<Programa>[] = [
    { header: 'Título', accessor: 'titulo', className: 'font-medium' },
    { 
      header: 'Tipo', 
      accessor: (prog: Programa) => (
        <Badge variant="outline">
          {prog.tipo?.toUpperCase() ?? 'STANDARD'}
        </Badge>
      )
    },
    { 
      header: 'Estado', 
      accessor: (prog: Programa) => (
        <Badge variant={prog.estado === 'published' ? 'success' : prog.estado === 'review' ? 'warning' : 'default'}>
          {prog.estado?.toUpperCase() ?? 'DRAFT'}
        </Badge>
      )
    },
    { header: 'Vagas', accessor: (prog: Programa) => prog.vagas ?? 'Ilimitadas' },
    { 
      header: 'Ações', 
      accessor: (prog: Programa) => (
        <div className="flex gap-2">
          <Button asChild size="sm" variant="secondary">
            <Link to={`/app/programas/${prog.id}`}>Ver</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link to={`/app/instituicao/editar-programa/${prog.id}`}>Editar</Link>
          </Button>
        </div>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Nossos Programas</h1>
        <Button asChild>
          <Link to="/app/instituicao/criar-programa">Criar Programa</Link>
        </Button>
      </div>

      <Card>
        {programas.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-4 text-center">
            <p className="text-muted-foreground">Ainda não criou nenhum programa.</p>
            <Button asChild variant="secondary">
              <Link to="/app/instituicao/criar-programa">Criar o primeiro</Link>
            </Button>
          </div>
        ) : (
          <Table columns={columns} data={programas} />
        )}
      </Card>
    </div>
  );
}

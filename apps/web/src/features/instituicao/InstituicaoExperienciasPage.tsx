import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { experienciasApi } from '@/lib/api/experiencias';
import { Card, Button, Table, Spinner, type Column } from '@/components/ui';
import { EditorialStateBadge } from '@/components/ui/EditorialStateBadge';
import type { ExperienciaMinha } from '@pdc/shared';
import { AlertCircle, Plus, RefreshCw } from 'lucide-react';

export function InstituicaoExperienciasPage() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['experiencias', 'minhas'],
    queryFn: () => experienciasApi.getMinhas(),
  });

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>;
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ink-primary">Experiências</h1>
            <p className="mt-1 text-sm text-ink-secondary">Cria e gere as experiências da instituição.</p>
          </div>
          <Button asChild>
            <Link to="/app/instituicao/criar-experiencia">
              <Plus className="mr-2 h-4 w-4" />
              Criar Experiência
            </Link>
          </Button>
        </div>
        <Card className="flex min-h-56 flex-col items-center justify-center gap-4 p-6 text-center">
          <AlertCircle className="h-8 w-8 text-danger" />
          <div>
            <h2 className="font-semibold text-ink-primary">Não foi possível carregar as experiências</h2>
            <p className="mt-1 text-sm text-ink-secondary">Tenta novamente. A criação continua disponível.</p>
          </div>
          <Button variant="secondary" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Tentar novamente
          </Button>
        </Card>
      </div>
    );
  }

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
            <Link to={`/app/experiencias/${exp.id}`}>Ver</Link>
          </Button>
        </div>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Experiências</h1>
          <p className="mt-1 text-sm text-ink-secondary">Cria e gere as experiências da instituição.</p>
        </div>
        <Button asChild>
          <Link to="/app/instituicao/criar-experiencia">
            <Plus className="mr-2 h-4 w-4" />
            Criar Experiência
          </Link>
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

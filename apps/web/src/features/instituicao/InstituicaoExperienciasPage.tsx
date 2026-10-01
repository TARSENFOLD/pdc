import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { experienciasApi } from '@/lib/api/experiencias';
import { Card, Button, Table, Spinner, type Column } from '@/components/ui';
import { EditorialStateBadge } from '@/components/ui/EditorialStateBadge';
import type { ExperienciaMinha } from '@pdc/shared';
import { AlertCircle, Plus, RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';

export function InstituicaoExperienciasPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['experiencias', 'minhas', page],
    queryFn: () => experienciasApi.getMinhas(page),
  });
  useEffect(() => {
    if (data) setPage((current) => Math.min(current, Math.max(1, data.pagination.pageCount)));
  }, [data]);

  if (isLoading)
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-ink-primary text-2xl font-bold">Experiências</h1>
            <p className="text-ink-secondary mt-1 text-sm">Cria e gere as tuas experiências.</p>
          </div>
          <Button asChild>
            <Link to="/app/instituicao/criar-experiencia">
              <Plus className="mr-2 h-4 w-4" />
              Criar Experiência
            </Link>
          </Button>
        </div>
        <Card className="flex min-h-56 flex-col items-center justify-center gap-4 p-6 text-center">
          <AlertCircle className="text-danger h-8 w-8" />
          <div>
            <h2 className="text-ink-primary font-semibold">
              Não foi possível carregar as experiências
            </h2>
            <p className="text-ink-secondary mt-1 text-sm">
              Tenta novamente. A criação continua disponível.
            </p>
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
      accessor: (exp: ExperienciaMinha) => <EditorialStateBadge state={exp.estado} />,
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
            <Link to={`/app/experiencias/${exp.id}?preview=1`}>Pré-visualizar</Link>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Experiências</h1>
          <p className="text-ink-secondary mt-1 text-sm">Cria e gere as tuas experiências.</p>
        </div>
        <Button asChild>
          <Link to="/app/instituicao/criar-experiencia">
            <Plus className="mr-2 h-4 w-4" />
            Criar Experiência
          </Link>
        </Button>
      </div>

      <Card>
        {user?.role === 'super_admin' && (
          <div className="p-4">
            <Button asChild variant="outline">
              <Link to="/app/instituicao/criar-experiencia?tipo=vwx">Criar VWX</Link>
            </Button>
          </div>
        )}
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
      {(data?.pagination.pageCount ?? 0) > 1 && (
        <nav
          aria-label="Paginação das minhas experiências"
          className="flex items-center justify-center gap-4"
        >
          <Button
            variant="outline"
            disabled={page === 1 || isFetching}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </Button>
          <span>
            {page} / {data?.pagination.pageCount}
          </span>
          <Button
            variant="outline"
            disabled={page >= (data?.pagination.pageCount ?? 1) || isFetching}
            onClick={() => setPage(page + 1)}
          >
            Próxima
          </Button>
        </nav>
      )}
    </div>
  );
}

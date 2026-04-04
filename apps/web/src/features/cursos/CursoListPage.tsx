import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { cursosApi } from '@/lib/api/cursos';
import { Spinner, Card, Pagination, Badge } from '@/components/ui';
import type { Curso } from '@pdc/shared';

function CursoCard({ curso }: { curso: Curso }) {
  return (
    <Link to={`/app/cursos/${curso.id}`}>
      <Card interactive className="overflow-hidden">
        {curso.capaUrl ? (
          <img src={curso.capaUrl} alt={curso.titulo} className="h-36 w-full object-cover" />
        ) : (
          <div className="h-36 w-full bg-surface-raised" />
        )}
        <div className="p-4">
          <h3 className="font-semibold text-text-primary line-clamp-1">{curso.titulo}</h3>
          <p className="mt-1 text-xs text-text-muted line-clamp-2">{curso.descricao}</p>
          <div className="mt-3 flex items-center gap-2">
            <Badge variant="warning">{curso.totalHoras}h</Badge>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export function CursoListPage() {
  const [search, setSearch] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['cursos', search, page],
    queryFn: () =>
      cursosApi.list({ page, pageSize: 12, ...(search ? { search } : {}) }),
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(inputValue);
    setPage(1);
  }

  const cursos = data?.data ?? [];
  const pageCount = data?.pagination.pageCount ?? 1;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Cursos</h1>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
            }}
            placeholder="Pesquisar cursos…"
            className="h-9 rounded-md border border-border bg-surface-raised px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-amber"
          />
          <button
            type="submit"
            className="h-9 rounded-md bg-amber px-4 text-sm font-semibold text-background hover:bg-amber-hover"
          >
            Pesquisar
          </button>
        </form>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : isError ? (
        <p className="py-12 text-center text-text-muted">Ocorreu um erro ao carregar os cursos.</p>
      ) : cursos.length === 0 ? (
        <p className="py-12 text-center text-text-muted">Nenhum curso encontrado.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {cursos.map((curso) => (
              <CursoCard key={curso.id} curso={curso} />
            ))}
          </div>
          {pageCount > 1 && (
            <Pagination page={page} pageCount={pageCount} onPageChange={setPage} className="mt-8" />
          )}
        </>
      )}
    </div>
  );
}

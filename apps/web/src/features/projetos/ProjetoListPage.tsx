import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { projetosApi } from '@/lib/api/projetos';
import { useAuth } from '@/lib/auth/AuthContext';
import { Spinner, Card, Pagination, Badge } from '@/components/ui';
import { SEOHead } from '@/components/layout/SEOHead';
import type { Projeto } from '@pdc/shared';

function ProjetoCard({ projeto }: { projeto: Projeto }) {
  const abierto = !!projeto.repoUrl;
  return (
    <Link to={`/projetos/${projeto.id}`}>
      <Card interactive className="overflow-hidden">
        {projeto.imagemUrl ? (
          <img src={projeto.imagemUrl} alt={projeto.titulo} className="h-36 w-full object-cover" />
        ) : (
          <div className="h-36 w-full bg-surface-raised" />
        )}
        <div className="p-4">
          <div className="mb-2 flex items-center gap-2">
            <Badge variant={abierto ? 'success' : 'outline'}>
              {abierto ? 'Aberto para colaboração' : 'Apenas exposição'}
            </Badge>
          </div>
          <h3 className="font-semibold text-text-primary line-clamp-1">{projeto.titulo}</h3>
          <p className="mt-1 text-xs text-text-muted line-clamp-2">{projeto.descricao}</p>
          {projeto.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {projeto.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline">{tag}</Badge>
              ))}
            </div>
          )}
          <div className="mt-3 text-right">
            <span className="text-xs font-medium text-amber">{abierto ? 'Conectar →' : 'Ver projecto →'}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export function ProjetoListPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['projetos', search, page],
    queryFn: () =>
      projetosApi.list({ page, pageSize: 12, ...(search ? { tags: search } : {}) }),
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(inputValue);
    setPage(1);
  }

  const projetos = data?.data ?? [];
  const pageCount = data?.pagination.pageCount ?? 1;

  return (
    <div>
      <SEOHead title="Projetos" description="Descobre projetos de estudantes e profissionais angolanos." url="https://usepdc.com/projetos" />
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Projetos</h1>
        <div className="flex items-center gap-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              value={inputValue}
              onChange={(e) => { setInputValue(e.target.value); }}
              placeholder="Filtrar por tag…"
              className="h-9 rounded-md border border-border bg-surface-raised px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-amber"
            />
            <button
              type="submit"
              className="h-9 rounded-md bg-amber px-4 text-sm font-semibold text-background hover:bg-amber-hover"
            >
              Filtrar
            </button>
          </form>
          {(['aluno', 'mentor', 'instituicao'] as string[]).includes(user?.role ?? '') && (
            <Link
              to="/app/projetos/novo"
              className="inline-flex h-8 items-center rounded-md bg-amber px-3 text-xs font-semibold text-background hover:bg-amber-hover"
            >
              Novo Projeto
            </Link>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : isError ? (
        <p className="py-12 text-center text-text-muted">Ocorreu um erro ao carregar os projetos.</p>
      ) : projetos.length === 0 ? (
        <p className="py-12 text-center text-text-muted">Nenhum projeto encontrado.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {projetos.map((projeto) => (
              <ProjetoCard key={projeto.id} projeto={projeto} />
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

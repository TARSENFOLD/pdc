import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useEffect, useState, type JSX } from 'react';
import type { ExperienciaPublica } from '@pdc/shared';
import { catalogoApi } from '@/lib/api/catalogo';
import { SEOHead } from '@/components/layout/SEOHead';
import { ExperienciaCard } from './components/ExperienciaCard';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { ExperienceCatalogFilters } from './components/ExperienceCatalogFilters';
import { resolveCatalogHref } from '@/components/catalogo/catalogoLinks';
import { useAuth } from '@/lib/auth/auth-context';
import {
  AreasDestaque,
  RecomendacoesSidebar,
  StarRatingWidget,
} from './components/ExperienceCatalogExtras';

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function ExperienciasCatalogoPage(): JSX.Element {
  const [sp, setSp] = useSearchParams();
  const { isAuthenticated } = useAuth();

  const area = sp.get('area') ?? '';
  const search = sp.get('q') ?? '';
  const [settledSearch, setSettledSearch] = useState(search);
  useEffect(() => {
    const timer = setTimeout(() => setSettledSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const nivel = sp.get('nivel') ?? '';
  const modalidade = sp.get('modalidade') ?? '';
  const tipo = sp.get('tipo');
  const tipoExperiencia = tipo === 'vwx' || tipo === 'institucional' ? tipo : undefined;
  const parsedPage = Number.parseInt(sp.get('page') ?? '1', 10);
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [
      'catalogo-experiencias',
      area,
      settledSearch,
      nivel,
      modalidade,
      page,
      tipoExperiencia,
    ],
    queryFn: () =>
      catalogoApi.getExperiencias({
        ...(tipoExperiencia ? { tipoExperiencia } : {}),
        ...(area ? { area } : {}),
        ...(settledSearch ? { search: settledSearch } : {}),
        ...(nivel ? { nivel } : {}),
        ...(modalidade ? { modalidade } : {}),
        page,
        pageSize: 12,
      }),
  });

  const experiencias = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const pageCount = data?.meta.pageCount ?? 1;
  const hasFilters = Boolean(area || search || nivel || modalidade || tipoExperiencia);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(sp);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setSp(next, { replace: true });
  }

  function clearFilters() {
    setSettledSearch('');
    setSp(new URLSearchParams());
  }

  return (
    <>
      <SEOHead
        title="Experiências e VWX — PDC"
        description="Conhece a realidade da formação e experimenta a prática profissional."
        url="https://usepdc.com/experiencias"
      />

      <div className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        {/* Header */}
        <header>
          <h1 className="text-ink-primary text-2xl font-bold">Experiências e VWX</h1>
          <p className="text-ink-secondary mt-1 text-sm">
            Explora uma formação ou experimenta uma profissão antes do próximo passo.
          </p>
        </header>
        <div className="flex flex-wrap gap-2" aria-label="Tipo de experiência">
          {(
            [
              ['', 'Todas'],
              ['institucional', 'Explorar formação'],
              ['vwx', 'Experimentar uma profissão'],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              variant={(tipoExperiencia ?? '') === value ? 'primary' : 'outline'}
              aria-pressed={(tipoExperiencia ?? '') === value}
              className="min-h-11"
              onClick={() => setParam('tipo', value)}
            >
              {label}
            </Button>
          ))}
        </div>

        <ExperienceCatalogFilters
          search={search}
          area={area}
          modalidade={modalidade}
          nivel={nivel}
          hasFilters={hasFilters}
          clearFilters={clearFilters}
          isLoading={isLoading}
          total={total}
          setParam={setParam}
        />

        {/* Main Grid + Sidebar */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_260px]">
          {/* ── Main column ── */}
          <main aria-label="Lista de experiências">
            {/* Estado: Loading */}
            {isLoading && (
              <div className="flex justify-center py-16">
                <Spinner size="md" />
              </div>
            )}

            {/* Estado: Erro */}
            {!isLoading && error && (
              <div className="space-y-3 py-12 text-center">
                <p className="text-ink-secondary text-sm">
                  Não foi possível carregar as experiências.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void refetch();
                  }}
                >
                  Tentar novamente
                </Button>
              </div>
            )}

            {/* Estado: Sem resultados */}
            {!isLoading && !error && experiencias.length === 0 && (
              <div data-testid="experiencias-empty" className="space-y-3 py-12 text-center">
                <p className="text-ink-primary text-sm font-medium">
                  {hasFilters
                    ? 'Nenhuma experiência encontrada com estes filtros.'
                    : 'Nenhuma experiência disponível de momento.'}
                </p>
                {hasFilters && (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Limpar filtros
                  </Button>
                )}
              </div>
            )}

            {/* Grelha de cards */}
            {!isLoading && !error && experiencias.length > 0 && (
              <>
                <ul
                  className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3"
                  role="list"
                  aria-label="Experiências disponíveis"
                >
                  {experiencias.map((exp: ExperienciaPublica) => (
                    <li key={exp.id} className="flex flex-col">
                      <ExperienciaCard
                        experiencia={exp}
                        href={resolveCatalogHref(
                          'experiencia',
                          exp.slug || exp.id,
                          isAuthenticated
                        )}
                      />
                      {/* Rating widget inline por card — apenas para utilizadores autenticados */}
                      {isAuthenticated && (
                        <div className="mt-1 px-1">
                          <StarRatingWidget expId={exp.id} />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>

                {/* Paginação */}
                {pageCount > 1 && (
                  <nav
                    className="mt-8 flex items-center justify-center gap-2"
                    aria-label="Paginação"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => {
                        setParam('page', String(page - 1));
                      }}
                      aria-label="Página anterior"
                    >
                      Anterior
                    </Button>
                    <span className="text-ink-tertiary text-xs tabular-nums">
                      {page} / {pageCount}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= pageCount}
                      onClick={() => {
                        setParam('page', String(page + 1));
                      }}
                      aria-label="Próxima página"
                    >
                      Próxima
                    </Button>
                  </nav>
                )}
              </>
            )}
          </main>

          {/* ── Sidebar ── */}
          <aside className="space-y-8 lg:sticky lg:top-6 lg:self-start" aria-label="Painel lateral">
            <AreasDestaque
              experiencias={experiencias}
              onAreaClick={(val) => {
                setParam('area', val);
              }}
              selectedArea={area}
            />

            <div className="border-border border-t pt-6">
              <RecomendacoesSidebar />
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

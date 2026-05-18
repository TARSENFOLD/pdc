import { useQuery } from '@tanstack/react-query';
import { useLocation, useSearchParams } from 'react-router-dom';
import type React from 'react';
import { catalogoApi } from '@/lib/api/catalogo';
import { SEOHead } from '@/components/layout/SEOHead';
import CatalogoGridShell from '@/components/catalogo/CatalogoGridShell';
import CatalogoFilterBar from '@/components/catalogo/CatalogoFilterBar';
import ContentCard from '@/components/catalogo/ContentCard';
import { resolveCatalogHref } from '@/components/catalogo/catalogoLinks';
import { Users, Clock, BookOpen } from 'lucide-react';
import type { CursoPublico } from '@pdc/shared';

const AREAS = [
  { value: 'SAUDE', label: 'Saúde' },
  { value: 'ENGENHARIA', label: 'Engenharia' },
  { value: 'TECNOLOGIA', label: 'Tecnologia' },
  { value: 'DIREITO', label: 'Direito' },
  { value: 'GESTAO', label: 'Gestão' },
  { value: 'ARTES', label: 'Artes' },
];

const SITE_ORIGIN = typeof window !== 'undefined' ? window.location.origin : 'https://usepdc.com';

export default function CursosCatalogoPage(): React.JSX.Element {
  const [sp, setSp] = useSearchParams();
  const location = useLocation();
  const area = sp.get('area') ?? '';
  const search = sp.get('q') ?? '';
  const parsedPage = Number.parseInt(sp.get('page') ?? '1', 10);
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const inApp = location.pathname.startsWith('/app');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['catalogo-cursos', area, search, page],
    queryFn: () => catalogoApi.getCursos({
      ...(area ? { area } : {}),
      ...(search ? { q: search } : {}),
      page,
      pageSize: 12,
    }),
  });

  const cursos = data?.data ?? [];

  return (
    <>
      <SEOHead
        title="Cursos"
        description="Percursos certificados por especialistas e instituições de prestígio."
        url={`${SITE_ORIGIN}/cursos`}
      />

      <div className="max-w-7xl mx-auto space-y-8">
        <header>
          <h1 className="text-2xl font-bold text-ink-primary">Cursos</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Percursos certificados por especialistas e instituições de prestígio.
          </p>
        </header>

        <CatalogoGridShell
          isLoading={isLoading}
          isEmpty={cursos.length === 0}
          error={error}
          onRetry={() => { void refetch(); }}
          onClearFilters={() => { setSp(new URLSearchParams()); }}
          emptyTitle="Nenhum curso nesta área"
          emptyDescription="Experimenta outra área ou aguarda novos conteúdos."
          filterBar={
            <CatalogoFilterBar
              areas={AREAS}
              selectedArea={area}
              searchTerm={search}
              onSearchChange={(val: string) => {
                const next = new URLSearchParams(sp);
                if (val) next.set('q', val); else next.delete('q');
                next.delete('page');
                setSp(next, { replace: true });
              }}
              onAreaChange={(val: string) => {
                const next = new URLSearchParams(sp);
                if (val) next.set('area', val); else next.delete('area');
                next.delete('page');
                setSp(next, { replace: true });
              }}
              totalResults={data?.meta.total ?? 0}
            />
          }
        >
          {cursos.map((c: CursoPublico) => (
            <ContentCard
              key={c.id}
              title={c.titulo}
              subtitle={c.autorNome}
              image={c.capaUrl || undefined}
              href={resolveCatalogHref('curso', inApp ? c.id : c.slug, inApp)}
              type="curso"
              ctaLabel="Ver curso"
              icon={BookOpen}
              badges={[
                { label: c.area || 'Geral', variant: 'info' },
                { label: c.nivel || 'Básico', variant: 'outline' },
              ]}
              footerInfo={[
                { icon: Clock, label: `${String(c.totalHoras || 0)}h` },
                { icon: Users, label: `${String(c.inscritosCount || 0)} inscritos` },
              ]}
            />
          ))}
        </CatalogoGridShell>
      </div>
    </>
  );
}

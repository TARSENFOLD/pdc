import { useQuery } from '@tanstack/react-query';
import { useLocation, useSearchParams } from 'react-router-dom';
import type React from 'react';
import { catalogoApi } from '@/lib/api/catalogo';
import { SEOHead } from '@/components/layout/SEOHead';
import CatalogoGridShell from '@/components/catalogo/CatalogoGridShell';
import CatalogoFilterBar from '@/components/catalogo/CatalogoFilterBar';
import ContentCard from '@/components/catalogo/ContentCard';
import { resolveCatalogHref } from '@/components/catalogo/catalogoLinks';
import { Building2, MapPin } from 'lucide-react';
import type { InstituicaoPublicaDetalhada } from '@pdc/shared';

const TIPOS = [
  { value: 'universidade', label: 'Universidade' },
  { value: 'instituto', label: 'Instituto' },
  { value: 'escola', label: 'Escola' },
  { value: 'centro_formacao', label: 'Centro de Formação' },
  { value: 'outro', label: 'Outro' },
];

export default function InstituicoesCatalogoPage(): React.JSX.Element {
  const [sp, setSp] = useSearchParams();
  const location = useLocation();
  const tipo = sp.get('tipo') ?? '';
  const search = sp.get('q') ?? '';
  const parsedPage = Number.parseInt(sp.get('page') ?? '1', 10);
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const inApp = location.pathname.startsWith('/app');
  const seoUrl = inApp ? `${window.location.origin}${location.pathname}` : 'https://usepdc.com/instituicoes';

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['catalogo-instituicoes', tipo, search, page],
    queryFn: () => catalogoApi.getInstituicoes({
      ...(tipo ? { tipo } : {}),
      ...(search ? { q: search } : {}),
      page,
      pageSize: 12,
    }),
  });

  const insts = data?.data ?? [];

  return (
    <>
      <SEOHead
        title="Instituições"
        description="Explora as melhores universidades, institutos e centros de formação parceiros do PDC."
        url={seoUrl}
      />

      <div className="max-w-7xl mx-auto space-y-8">
        <header>
          <h1 className="text-2xl font-bold text-ink-primary">Instituições Parceiras</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Universidades, institutos e centros de formação que validam o teu percurso académico.
          </p>
        </header>

        <CatalogoGridShell
          isLoading={isLoading}
          isEmpty={insts.length === 0}
          error={error}
          onRetry={() => { void refetch(); }}
          onClearFilters={() => { setSp(new URLSearchParams()); }}
          emptyTitle="Nenhuma instituição nesta categoria"
          emptyDescription="Experimenta outra categoria ou aguarda novos parceiros."
          filterBar={
            <CatalogoFilterBar
              areas={TIPOS}
              selectedArea={tipo}
              searchTerm={search}
              onSearchChange={(val: string) => {
                const next = new URLSearchParams(sp);
                if (val) next.set('q', val); else next.delete('q');
                next.delete('page');
                setSp(next, { replace: true });
              }}
              onAreaChange={(val: string) => {
                const next = new URLSearchParams(sp);
                if (val) next.set('tipo', val); else next.delete('tipo');
                next.delete('page');
                setSp(next, { replace: true });
              }}
              totalResults={data?.meta.total ?? 0}
            />
          }
        >
          {insts.map((i: InstituicaoPublicaDetalhada) => {
            const regionLabel = i.localizacao?.provincia ?? 'Angola';
            return (
            <ContentCard
              key={i.id}
              title={i.nome}
              subtitle={i.tipo ? i.tipo.charAt(0).toUpperCase() + i.tipo.slice(1).replaceAll('_', ' ') : 'Instituição Parceira'}
              image={i.multimedia?.logoUrl}
              href={resolveCatalogHref('instituicao', i.slug, inApp)}
              type="instituicao"
              ctaLabel="Ver instituição"
              icon={Building2}
              badges={[
                { label: regionLabel, variant: 'outline' },
              ]}
              footerInfo={[
                { icon: Building2, label: 'Parceiro PDC' },
                { icon: MapPin, label: regionLabel },
              ]}
            />
          );})}
        </CatalogoGridShell>
      </div>
    </>
  );
}

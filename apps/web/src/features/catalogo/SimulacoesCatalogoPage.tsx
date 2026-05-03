import { useQuery } from '@tanstack/react-query';
import { useLocation, useSearchParams } from 'react-router-dom';
import { catalogoApi } from '@/lib/api/catalogo';
import { SEOHead } from '@/components/layout/SEOHead';
import CatalogoGridShell from '@/components/catalogo/CatalogoGridShell';
import CatalogoFilterBar from '@/components/catalogo/CatalogoFilterBar';
import ContentCard from '@/components/catalogo/ContentCard';
import { resolveCatalogHref } from '@/components/catalogo/catalogoLinks';
import { Target, Activity, FlaskConical } from 'lucide-react';

const AREAS = [
  { value: 'TECNOLOGIA', label: 'Tecnologia' },
  { value: 'ENGENHARIA', label: 'Engenharia' },
  { value: 'SAUDE', label: 'Saúde' },
  { value: 'GESTAO', label: 'Gestão' },
];

export function SimulacoesCatalogoPage() {
  const [sp, setSp] = useSearchParams();
  const location = useLocation();
  const area = sp.get('area') ?? '';
  const search = sp.get('q') ?? '';
  const page = Number(sp.get('page') ?? '1');
  const inApp = location.pathname.startsWith('/app');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['catalogo-simulacoes', area, search, page],
    queryFn: () => catalogoApi.getSimulacoes({
      ...(area ? { area } : {}),
      ...(search ? { q: search } : {}),
      page,
      pageSize: 12,
    }),
  });

  const sims = data?.data ?? [];

  return (
    <>
      <SEOHead
        title="Simulações"
        description="Experimenta profissões reais e recebe um diagnóstico sobre a tua aptidão."
        url="https://usepdc.com/simulacoes"
      />

      <div className="max-w-7xl mx-auto space-y-8">
        <header>
          <h1 className="text-2xl font-bold text-ink-primary">Simulações</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Vive o dilema real da profissão e recebe um diagnóstico sobre a tua aptidão.
          </p>
        </header>

        <CatalogoGridShell
          isLoading={isLoading}
          isEmpty={sims.length === 0}
          error={error}
          onRetry={() => { void refetch(); }}
          onClearFilters={() => { setSp(new URLSearchParams()); }}
          emptyTitle="Nenhuma simulação nesta área"
          emptyDescription="Experimenta outra área ou aguarda novos conteúdos."
          filterBar={
            <CatalogoFilterBar
              areas={AREAS}
              selectedArea={area}
              searchTerm={search}
              onSearchChange={(val) => {
                const next = new URLSearchParams(sp);
                if (val) next.set('q', val); else next.delete('q');
                next.delete('page');
                setSp(next, { replace: true });
              }}
              onAreaChange={(val) => {
                const next = new URLSearchParams(sp);
                if (val) next.set('area', val); else next.delete('area');
                next.delete('page');
                setSp(next, { replace: true });
              }}
              totalResults={data?.meta.total}
            />
          }
        >
          {sims.map((s) => (
            <ContentCard
              key={s.id}
              title={s.titulo}
              subtitle={s.area}
              image={s.capaUrl || undefined}
              href={resolveCatalogHref('simulacao', s.slug || s.id, inApp)}
              type="simulacao"
              ctaLabel="Experimentar"
              icon={FlaskConical}
              badges={[{ label: `Tipo ${String(s.tipo)}`, variant: 'accent' }]}
              footerInfo={[
                { icon: Activity, label: 'Telemetria Ativa' },
                { icon: Target, label: 'Aptidão ϕ' },
              ]}
            />
          ))}
        </CatalogoGridShell>
      </div>
    </>
  );
}

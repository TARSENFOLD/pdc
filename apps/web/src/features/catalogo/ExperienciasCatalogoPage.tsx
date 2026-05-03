import { useQuery } from '@tanstack/react-query';
import { useLocation, useSearchParams } from 'react-router-dom';
import { catalogoApi } from '@/lib/api/catalogo';
import { SEOHead } from '@/components/layout/SEOHead';
import CatalogoGridShell from '@/components/catalogo/CatalogoGridShell';
import CatalogoFilterBar from '@/components/catalogo/CatalogoFilterBar';
import ContentCard from '@/components/catalogo/ContentCard';
import { resolveCatalogHref } from '@/components/catalogo/catalogoLinks';
import { MapPin, Calendar, Building2 } from 'lucide-react';
import type { ExperienciaPublica, AreaVocacional } from '@pdc/shared';

const AREAS: Array<{ value: AreaVocacional; label: string }> = [
  { value: 'SAUDE', label: 'Saúde' },
  { value: 'ENGENHARIA', label: 'Engenharia' },
  { value: 'TECNOLOGIA', label: 'Tecnologia' },
  { value: 'DIREITO', label: 'Direito' },
  { value: 'GESTAO', label: 'Gestão' },
  { value: 'EDUCACAO', label: 'Educação' },
  { value: 'ARTES', label: 'Artes' },
  { value: 'CIENCIAS_AGRARIAS', label: 'Ciências Agrárias' },
  { value: 'CIENCIAS_SOCIAIS', label: 'Ciências Sociais' },
  { value: 'COMUNICACAO', label: 'Comunicação' },
  { value: 'CIENCIAS_NATURAIS', label: 'Ciências Naturais' },
  { value: 'ARQUITETURA', label: 'Arquitetura' },
  { value: 'TURISMO_HOTELARIA', label: 'Turismo e Hotelaria' },
  { value: 'DESPORTO', label: 'Desporto' },
  { value: 'OUTRA', label: 'Outra' },
];

export function ExperienciasCatalogoPage() {
  const [sp, setSp] = useSearchParams();
  const location = useLocation();
  const area = sp.get('area') ?? '';
  const search = sp.get('q') ?? '';
  const page = Number(sp.get('page') ?? '1');
  const inApp = location.pathname.startsWith('/app');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['catalogo-experiencias', area, search, page],
    queryFn: () => catalogoApi.getExperiencias({
      ...(area ? { area } : {}),
      ...(search ? { search } : {}),
      page,
      pageSize: 12,
    }),
  });

  const experiencias = data?.data ?? [];

  return (
    <>
      <SEOHead
        title="Experiências"
        description="Roteiros imersivos em instituições de elite para validar o teu interesse real."
        url="https://usepdc.com/experiencias"
      />

      <div className="max-w-7xl mx-auto space-y-8">
        <header>
          <h1 className="text-2xl font-bold text-ink-primary">Experiências</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Roteiros imersivos em instituições de elite para validar o teu interesse real.
          </p>
        </header>

        <CatalogoGridShell
          isLoading={isLoading}
          isEmpty={experiencias.length === 0}
          error={error}
          onRetry={() => { void refetch(); }}
          onClearFilters={() => { setSp(new URLSearchParams()); }}
          emptyTitle="Nenhuma experiência nesta área"
          emptyDescription="Experimenta outra área ou aguarda novos roteiros imersivos."
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
          {experiencias.map((exp: ExperienciaPublica) => (
            <ContentCard
              key={exp.id}
              title={exp.titulo}
              subtitle={exp.instituicao?.nome || 'Instituição PDC'}
              image={exp.capaUrl || undefined}
              href={resolveCatalogHref('experiencia', exp.slug || exp.id, inApp)}
              type="experiencia"
              ctaLabel="Ver experiência"
              icon={MapPin}
              badges={[
                { label: exp.area || 'Geral', variant: 'info' },
                ...(exp.gratuito ? [{ label: 'Gratuito', variant: 'success' as const }] : []),
              ]}
              footerInfo={[
                ...(exp.dataInicio ? [{ icon: Calendar, label: new Date(exp.dataInicio).toLocaleDateString('pt-AO', { month: 'short', year: 'numeric' }) }] : []),
                { icon: Building2, label: exp.instituicao?.nome || 'Presencial' },
              ]}
            />
          ))}
        </CatalogoGridShell>
      </div>
    </>
  );
}

import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { catalogoApi } from '@/lib/api/catalogo';
import { SEOHead } from '@/components/layout/SEOHead';
import { CatalogoGridShell } from '@/components/catalogo/CatalogoGridShell';
import { CatalogoFilterBar } from '@/components/catalogo/CatalogoFilterBar';
import { ContentCard } from '@/components/catalogo/ContentCard';
import { Target, Activity } from 'lucide-react';

const AREAS = [
  { value: 'TECNOLOGIA', label: 'Tecnologia' },
  { value: 'ENGENHARIA', label: 'Engenharia' },
  { value: 'SAUDE', label: 'Saúde' },
  { value: 'GESTAO', label: 'Gestão' },
];

export function SimulacoesCatalogoPage() {
  const [sp, setSp] = useSearchParams();
  const area = sp.get('area') ?? '';
  const search = sp.get('q') ?? '';
  const page = Number(sp.get('page') ?? '1');

  const { data, isLoading } = useQuery({
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
    <div className="min-h-screen bg-canvas px-4 py-20 sm:px-8">
      <SEOHead 
        title="Catálogo de Simulações" 
        description="Experimenta profissões reais e testa as tuas aptidões com simulações de alto impacto." 
        url="https://usepdc.com/simulacoes" 
      />
      
      <div className="mx-auto max-w-7xl">
        <header className="mb-12">
          <div className="inline-flex items-center rounded-full bg-elevated px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-accent border border-ink-tertiary/10 mb-4">
            ⚡ Decisão Baseada em Dados
          </div>
          <h1 className="text-4xl font-black tracking-tight text-ink-primary sm:text-5xl">Simulações Práticas.</h1>
          <p className="mt-4 text-lg text-ink-secondary max-w-2xl leading-relaxed">
            Não escolhas um curso por intuição. Vive o dilema real da profissão e recebe um diagnóstico de precisão sobre a tua aptidão biomecânica.
          </p>
        </header>

        <CatalogoGridShell
          isLoading={isLoading}
          isEmpty={sims.length === 0}
          onClearFilters={() => setSp(new URLSearchParams())}
          filterBar={
            <CatalogoFilterBar
              searchTerm={search}
              onSearchChange={(val) => {
                const next = new URLSearchParams(sp);
                if (val) next.set('q', val); else next.delete('q');
                next.delete('page');
                setSp(next, { replace: true });
              }}
              areas={AREAS}
              selectedArea={area}
              onAreaChange={(val) => {
                const next = new URLSearchParams(sp);
                if (val) next.set('area', val); else next.delete('area');
                next.delete('page');
                setSp(next, { replace: true });
              }}
              totalResults={data?.meta?.total}
            />
          }
        >
          {sims.map((s) => (
            <ContentCard
              key={s.id}
              title={s.titulo}
              subtitle={s.area}
              image={s.capaUrl || undefined}
              href={`/simulacoes/${s.slug || s.id}`}
              badges={[{ label: `Tipo ${s.tipo}`, variant: 'accent' }]}
              footerInfo={[
                { icon: Activity, label: 'Telemetria Ativa' },
                { icon: Target, label: 'Aptidão ϕ' }
              ]}
            />
          ))}
        </CatalogoGridShell>
      </div>
    </div>
  );
}

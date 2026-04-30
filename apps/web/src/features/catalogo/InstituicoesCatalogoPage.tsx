import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { catalogoApi } from '@/lib/api/catalogo';
import { SEOHead } from '@/components/layout/SEOHead';
import CatalogoGridShell from '@/components/catalogo/CatalogoGridShell';
import CatalogoFilterBar from '@/components/catalogo/CatalogoFilterBar';
import ContentCard from '@/components/catalogo/ContentCard';
import { Building2, MapPin } from 'lucide-react';
import type { InstituicaoPublica } from '@pdc/shared';

const TIPOS = [
  { value: 'universidade', label: 'Universidade' },
  { value: 'escola_tecnica', label: 'Escola Técnica' },
  { value: 'centro_formacao', label: 'Centro de Formação' },
  { value: 'outro', label: 'Outro' },
];

export function InstituicoesCatalogoPage() {
  const [sp, setSp] = useSearchParams();
  const tipo = sp.get('tipo') ?? '';
  const search = sp.get('q') ?? '';
  const page = Number(sp.get('page') ?? '1');

  const { data, isLoading } = useQuery({
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
        url="https://usepdc.com/instituicoes"
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
          onClearFilters={() => { setSp(new URLSearchParams()); }}
          emptyTitle="Nenhuma instituição nesta categoria"
          emptyDescription="Experimenta outra categoria ou aguarda novos parceiros."
          filterBar={
            <CatalogoFilterBar
              areas={TIPOS}
              selectedArea={tipo}
              onAreaChange={(val) => {
                const next = new URLSearchParams(sp);
                if (val) next.set('tipo', val); else next.delete('tipo');
                next.delete('page');
                setSp(next, { replace: true });
              }}
              totalResults={data?.meta.total}
            />
          }
        >
          {insts.map((i: InstituicaoPublica) => (
            <ContentCard
              key={i.id}
              title={i.nome}
              subtitle={i.tipo ? i.tipo.charAt(0).toUpperCase() + i.tipo.slice(1).replaceAll('_', ' ') : 'Instituição Parceira'}
              image={i.logoUrl || undefined}
              href={`/instituicoes/${i.slug || i.id}`}
              icon={Building2}
              badges={[
                { label: i.regiao || 'Angola', variant: 'outline' },
              ]}
              footerInfo={[
                { icon: Building2, label: 'Parceiro PDC' },
                { icon: MapPin, label: i.regiao || 'Ver Localização' },
              ]}
            />
          ))}
        </CatalogoGridShell>
      </div>
    </>
  );
}

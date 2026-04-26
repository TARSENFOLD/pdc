import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { catalogoApi } from '@/lib/api/catalogo';
import { SEOHead } from '@/components/layout/SEOHead';
import { CatalogoGridShell } from '@/components/catalogo/CatalogoGridShell';
import { CatalogoFilterBar } from '@/components/catalogo/CatalogoFilterBar';
import { ContentCard } from '@/components/catalogo/ContentCard';
import { Building2, MapPin } from 'lucide-react';
import type { InstituicaoPublica } from '@pdc/shared';

const TIPOS = [
  { value: 'universidade', label: 'Universidade' },
  { value: 'escola_tecnica', label: 'Escola Técnica' },
  { value: 'centro_formacao', label: 'Centro de Formação' },
  { value: 'outro', label: 'Outro' }
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

  const handleTipoChange = (val: string) => {
    const next = new URLSearchParams(sp);
    if (val) next.set('tipo', val); else next.delete('tipo');
    next.delete('page');
    setSp(next, { replace: true });
  };

  const handleSearch = (val: string) => {
    const next = new URLSearchParams(sp);
    if (val) next.set('q', val); else next.delete('q');
    next.delete('page');
    setSp(next, { replace: true });
  };

  return (
    <div className="min-h-screen bg-canvas px-4 py-20 sm:px-8">
      <SEOHead 
        title="Instituições de Ensino" 
        description="Explora as melhores universidades, institutos e centros de formação parceiros do PDC." 
        url="https://usepdc.com/instituicoes" 
      />
      
      <div className="mx-auto max-w-7xl">
        <header className="mb-12">
          <div className="inline-flex items-center rounded-full bg-elevated px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-accent border border-ink-tertiary/10 mb-4">
            🏛️ Ecossistema Académico
          </div>
          <h1 className="text-4xl font-black tracking-tight text-ink-primary sm:text-5xl">Parceiros de Futuro.</h1>
          <p className="mt-4 text-lg text-ink-secondary max-w-2xl leading-relaxed">
            A PDC colabora com as instituições mais inovadoras para garantir que o teu percurso académico seja validado e reconhecido.
          </p>
        </header>

        <CatalogoGridShell
          isLoading={isLoading}
          isEmpty={insts.length === 0}
          onClearFilters={() => setSp(new URLSearchParams())}
          filterBar={
            <CatalogoFilterBar
              searchTerm={search}
              onSearchChange={handleSearch}
              areas={TIPOS}
              selectedArea={tipo}
              onAreaChange={handleTipoChange}
              totalResults={data?.meta?.total}
            />
          }
        >
          {insts.map((i: InstituicaoPublica) => (
            <ContentCard
              key={i.id}
              title={i.nome}
              subtitle={i.tipo ? i.tipo.charAt(0).toUpperCase() + i.tipo.slice(1).replace('_', ' ') : 'Instituição Parceira'}
              image={i.logoUrl || undefined}
              href={`/instituicoes/${i.slug || i.id}`}
              badges={[
                { label: i.regiao || 'Angola', variant: 'outline' }
              ]}
              footerInfo={[
                { icon: Building2, label: 'Parceiro PDC' },
                { icon: MapPin, label: i.regiao || 'Ver Localização' }
              ]}
            />
          ))}
        </CatalogoGridShell>
      </div>
    </div>
  );
}

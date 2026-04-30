import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { catalogoApi } from '@/lib/api/catalogo';
import { SEOHead } from '@/components/layout/SEOHead';
import CatalogoGridShell from '@/components/catalogo/CatalogoGridShell';
import CatalogoFilterBar from '@/components/catalogo/CatalogoFilterBar';
import ContentCard from '@/components/catalogo/ContentCard';
import { Users, Clock } from 'lucide-react';
import type { CursoPublico } from '@pdc/shared';

const AREAS = [
  { value: 'SAUDE', label: 'Saúde' },
  { value: 'ENGENHARIA', label: 'Engenharia' },
  { value: 'TECNOLOGIA', label: 'Tecnologia' },
  { value: 'DIREITO', label: 'Direito' },
  { value: 'GESTAO', label: 'Gestão' },
  { value: 'ARTES', label: 'Artes' },
];

export function CursosCatalogoPage() {
  const [sp, setSp] = useSearchParams();
  const area = sp.get('area') ?? '';
  const search = sp.get('q') ?? '';
  const page = Number(sp.get('page') ?? '1');

  const { data, isLoading } = useQuery({
    queryKey: ['catalogo-cursos', area, search, page],
    queryFn: () => catalogoApi.getCursos({
      ...(area ? { area } : {}),
      ...(search ? { q: search } : {}),
      page,
      pageSize: 12,
    }),
  });

  const cursos = data?.data ?? [];

  const handleAreaChange = (val: string) => {
    const next = new URLSearchParams(sp);
    if (val) next.set('area', val); else next.delete('area');
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
        title="Catálogo de Cursos" 
        description="Explora cursos com certificado de instituições parceiras angolanas e internacionais." 
        url="https://usepdc.com/cursos" 
      />
      
      <div className="mx-auto max-w-7xl">
        <header className="mb-12">
          <div className="inline-flex items-center rounded-full bg-elevated px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-accent border border-ink-tertiary/10 mb-4">
            📚 Especialização
          </div>
          <h1 className="text-4xl font-black tracking-tight text-ink-primary sm:text-5xl">Cursos Certificados.</h1>
          <p className="mt-4 text-lg text-ink-secondary max-w-2xl leading-relaxed">
            Domina as competências mais procuradas pelo mercado através de percursos desenhados por especialistas e instituições de prestígio.
          </p>
        </header>

        <CatalogoGridShell
          isLoading={isLoading}
          isEmpty={cursos.length === 0}
          onClearFilters={() => { setSp(new URLSearchParams()); }}
          filterBar={
            <CatalogoFilterBar
              searchTerm={search}
              onSearchChange={handleSearch}
              areas={AREAS}
              selectedArea={area}
              onAreaChange={handleAreaChange}
              totalResults={data?.meta.total}
            />
          }
        >
          {cursos.map((c: CursoPublico) => (
            <ContentCard
              key={c.id}
              title={c.titulo}
              subtitle={c.autorNome}
              image={c.capaUrl || undefined}
              href={`/cursos/${c.slug}`}
              badges={[
                { label: c.area || 'Geral', variant: 'info' },
                { label: c.nivel || 'Básico', variant: 'outline' }
              ]}
              footerInfo={[
                { icon: Clock, label: `${String(c.totalHoras || 0)}h` },
                { icon: Users, label: `${String(c.inscritosCount || 0)} inscritos` }
              ]}
            />
          ))}
        </CatalogoGridShell>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { programasApi } from '@/lib/api/programas';
import { SEOHead } from '@/components/layout/SEOHead';
import { CatalogoGridShell } from '@/components/catalogo/CatalogoGridShell';
import { CatalogoFilterBar } from '@/components/catalogo/CatalogoFilterBar';
import { ContentCard } from '@/components/catalogo/ContentCard';
import { Briefcase, Layers } from 'lucide-react';

const TIPOS = [
  { value: 'standard', label: 'Standard' },
  { value: 'shadowapro', label: 'Shadow a Pro' },
  { value: 'eduvisit', label: 'EduVisita' },
];

export function ProgramasCatalogoPage() {
  const [tipo, setTipo] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['programas-publicos', tipo, search],
    queryFn: () => programasApi.list({ 
      ...(tipo ? { tipo } : {}),
      ...(search ? { search } : {})
    }),
  });

  const programas = data?.data ?? [];

  return (
    <div className="min-h-screen bg-canvas px-4 py-20 sm:px-8">
      <SEOHead title="Roteiros Institucionais" description="Explora programas de acesso e imersão desenhados por instituições de elite." />
      
      <div className="mx-auto max-w-7xl">
        <header className="mb-12">
          <div className="inline-flex items-center rounded-full bg-elevated px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-accent border border-ink-tertiary/10 mb-4">
            💼 Roteiros Corporativos
          </div>
          <h1 className="text-4xl font-black tracking-tight text-ink-primary sm:text-5xl">Programas de Acesso.</h1>
          <p className="mt-4 text-lg text-ink-secondary max-w-2xl leading-relaxed">
            Percursos integrados que ligam o conhecimento teórico à realidade prática das maiores instituições do país.
          </p>
        </header>

        <CatalogoGridShell
          isLoading={isLoading}
          isEmpty={programas.length === 0}
          onClearFilters={() => { setTipo(''); setSearch(''); }}
          filterBar={
            <CatalogoFilterBar
              searchTerm={search}
              onSearchChange={setSearch}
              areas={TIPOS}
              selectedArea={tipo}
              onAreaChange={setTipo}
            />
          }
        >
          {programas.map((p: Programa) => (
            <ContentCard
              key={p.id}
              title={p.titulo}
              subtitle={p.instituicaoNome || 'Instituição PDC'}
              image={p.capaUrl || undefined}
              href={`/programas/${p.slug || p.id}`}
              badges={[
                { label: p.tipo?.toUpperCase() || 'PROGRAMA', variant: 'info' },
                { label: p.area, variant: 'outline' }
              ]}
              footerInfo={[
                { icon: Briefcase, label: p.modalidade || 'Presencial' },
                { icon: Layers, label: `${p.vagas || 0} vagas` }
              ]}
            />
          ))}
        </CatalogoGridShell>
      </div>
    </div>
  );
}

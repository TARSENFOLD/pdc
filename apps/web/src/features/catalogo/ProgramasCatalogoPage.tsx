import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { programasApi } from '@/lib/api/programas';
import { SEOHead } from '@/components/layout/SEOHead';
import CatalogoGridShell from '@/components/catalogo/CatalogoGridShell';
import CatalogoFilterBar from '@/components/catalogo/CatalogoFilterBar';
import ContentCard from '@/components/catalogo/ContentCard';
import { Briefcase, Layers, GraduationCap } from 'lucide-react';
import type { Programa } from '@pdc/shared';

const TIPOS = [
  { value: 'standard', label: 'Standard' },
  { value: 'shadowapro', label: 'Shadow a Pro' },
  { value: 'eduvisit', label: 'EduVisita' },
];

export function ProgramasCatalogoPage() {
  const [tipo, setTipo] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['programas-publicos', tipo],
    queryFn: () => programasApi.list({
      ...(tipo ? { tipo } : {}),
    }),
  });

  const programas = data?.data ?? [];

  return (
    <>
      <SEOHead
        title="Programas"
        description="Percursos integrados que ligam o conhecimento teórico à realidade prática das maiores instituições."
      />

      <div className="max-w-7xl mx-auto space-y-8">
        <header>
          <h1 className="text-2xl font-bold text-ink-primary">Programas de Acesso</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Percursos integrados que ligam o conhecimento teórico à realidade prática.
          </p>
        </header>

        <CatalogoGridShell
          isLoading={isLoading}
          isEmpty={programas.length === 0}
          onClearFilters={() => { setTipo(''); }}
          emptyTitle="Nenhum programa nesta categoria"
          emptyDescription="Experimenta outra categoria ou aguarda novos programas."
          filterBar={
            <CatalogoFilterBar
              areas={TIPOS}
              selectedArea={tipo}
              onAreaChange={setTipo}
              totalResults={data?.data.length}
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
              icon={GraduationCap}
              badges={[
                { label: p.tipo.toUpperCase(), variant: 'info' },
                { label: p.area, variant: 'outline' },
              ]}
              footerInfo={[
                { icon: Briefcase, label: p.modalidade || 'Presencial' },
                { icon: Layers, label: `${String(p.vagas || 0)} vagas` },
              ]}
            />
          ))}
        </CatalogoGridShell>
      </div>
    </>
  );
}

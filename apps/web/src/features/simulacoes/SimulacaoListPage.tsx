import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, Target, Activity } from 'lucide-react';
import { simulacoesApi } from '../../lib/api/simulacoes';
import { EditorialStateBadge } from '@/components/ui/EditorialStateBadge';
import CatalogoGridShell from '@/components/catalogo/CatalogoGridShell';
import CatalogoFilterBar from '@/components/catalogo/CatalogoFilterBar';
import ContentCard from '@/components/catalogo/ContentCard';

interface SimulacaoItem {
  id: string;
  titulo: string;
  area: string;
  capaUrl?: string | null | undefined;
  tipo: number;
  estado?: string;
}

const AREAS = [
  { value: 'TECNOLOGIA', label: 'Tecnologia' },
  { value: 'ENGENHARIA', label: 'Engenharia' },
  { value: 'SAUDE', label: 'Saúde' },
];

export const SimulacaoListPage = () => {
  const [search, setSearch] = useState('');
  const [area, setArea] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['simulacoes-list', search, area, page],
    queryFn: () => simulacoesApi.list({ 
      page, 
      pageSize: 12, 
      ...(search ? { search } : {}),
      ...(area ? { area } : {})
    }),
  });

  const simulacoes = data?.data ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-12 pb-20 px-4 sm:px-6 lg:px-8">
      {/* Header Soberano */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-12">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-black uppercase tracking-[0.2em] mb-6">
             <Sparkles size={12} /> Oráculo de Experiência
          </div>
          <h1 className="text-4xl font-black text-ink-primary tracking-tighter sm:text-6xl font-display leading-[0.95]">
            Vitrinas <span className="text-accent italic">Vivas.</span>
          </h1>
          <p className="text-ink-secondary mt-6 text-lg font-medium leading-relaxed">
            Experimenta o future antes de decidires. As nossas simulações capturam o teu músculo cognitivo em tempo real.
          </p>
        </div>
      </header>

      <CatalogoGridShell
        isLoading={isLoading}
        isEmpty={simulacoes.length === 0}
        onClearFilters={() => { setSearch(''); setArea(''); setPage(1); }}
        filterBar={
          <CatalogoFilterBar
            searchTerm={search}
            onSearchChange={(val) => { setSearch(val); setPage(1); }}
            areas={AREAS}
            selectedArea={area}
            onAreaChange={(val) => { setArea(val); setPage(1); }}
            totalResults={data?.pagination.total ?? 0}
          />
        }
      >
        {simulacoes.map((s: SimulacaoItem) => (
          <div key={s.id} className="relative">
            {s.estado && (
              <div className="absolute top-3 left-3 z-10">
                <EditorialStateBadge state={s.estado} />
              </div>
            )}
            <ContentCard
              title={s.titulo}
              subtitle={s.area}
              image={s.capaUrl || undefined}
              href={`/app/simulacoes/${s.id}`}
              badges={[{ label: `Tipo ${String(s.tipo)}`, variant: 'accent' }]}
              footerInfo={[
                { icon: Activity, label: 'Bio-Sync ON' },
                { icon: Target, label: 'Músculo ϕ' }
              ]}
            />
          </div>
        ))}
      </CatalogoGridShell>
    </div>
  );
};

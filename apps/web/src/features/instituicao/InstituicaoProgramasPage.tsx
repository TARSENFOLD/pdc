import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Spinner } from '@/components/ui';
import { CatalogoGridShell } from '@/components/catalogo/CatalogoGridShell';
import CatalogoFilterBar from '@/components/catalogo/CatalogoFilterBar';
import ContentCard from '@/components/catalogo/ContentCard';
import { Calendar, Users, Building2 } from 'lucide-react';
import { http } from '@/lib/api/http';
import type { Programa } from '@pdc/shared';

const TIPOS = [
  { value: 'standard', label: 'Standard' },
  { value: 'shadowapro', label: 'Shadow a Pro' },
  { value: 'eduvisit', label: 'EduVisita' },
];

export function InstituicaoProgramasPage() {
  const [tipo, setTipo] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery<{ data: Programa[] }>({
    queryKey: ['programas', 'list', tipo, search],
    queryFn: () => {
      const q = new URLSearchParams();
      if (tipo) q.set('tipo', tipo);
      if (search) q.set('search', search);
      return http.get<{ data: Programa[] }>(`/programas?${q.toString()}`);
    },
  });

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>;

  const programas = data?.data ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-12 pb-20 px-4 sm:px-6 lg:px-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-12">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-black uppercase tracking-[0.2em] mb-6">
             <Building2 size={12} /> Institutional Roadmaps
          </div>
          <h1 className="text-4xl font-black text-ink-primary tracking-tighter sm:text-6xl font-display leading-[0.95]">
            Os Meus <span className="text-accent italic">Programas.</span>
          </h1>
          <p className="text-ink-secondary mt-6 text-lg font-medium leading-relaxed max-w-2xl">
            Gere as vossas iniciativas de imersão e desenvolvimento de talento.
          </p>
        </div>
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
        {programas.map((prog) => (
          <ContentCard
            key={prog.id}
            title={prog.titulo}
            subtitle={prog.instituicaoNome || 'Instituição Parceira'}
            image={prog.capaUrl || undefined}
            href={`/app/programas/${prog.id}`}
            badges={[
              { label: prog.estado.toUpperCase(), variant: 'info' },
              { label: prog.modalidade || 'Presencial', variant: 'outline' }
            ]}
            footerInfo={[
              { icon: Users, label: `${String(prog.vagas || 0)} vagas` },
              { icon: Calendar, label: prog.duracao || 'N/A' }
            ]}
          />
        ))}
      </CatalogoGridShell>
    </div>
  );
}

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { cursosApi } from '@/lib/api/cursos';
import { CatalogoGridShell } from '@/components/catalogo/CatalogoGridShell';
import { CatalogoFilterBar } from '@/components/catalogo/CatalogoFilterBar';
import { ContentCard } from '@/components/catalogo/ContentCard';
import { Clock, GraduationCap, Users } from 'lucide-react';
import { CursoItemSchema, type CursoItem } from '@pdc/shared';

const AREAS = [
  { value: 'TECNOLOGIA', label: 'Tecnologia' },
  { value: 'SAUDE', label: 'Saúde' },
  { value: 'DIREITO', label: 'Direito' },
  { value: 'GESTAO', label: 'Gestão' },
];

export function CursoListPage() {
  const [search, setSearch] = useState('');
  const [area, setArea] = useState('');
  const [page] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['cursos-list', search, area, page],
    queryFn: () => cursosApi.list({ 
      page, 
      pageSize: 12, 
      ...(search ? { search } : {}),
      ...(area ? { area } : {})
    }),
  });

  const rawData = data?.data ?? [];
  const parsed = z.array(CursoItemSchema).safeParse(rawData);
  if (!parsed.success) {
    console.error('API validation error:', parsed.error);
  }
  const cursos = parsed.success ? parsed.data : [];

  return (
    <div className="mx-auto max-w-7xl space-y-12 pb-20 px-4 sm:px-6 lg:px-8">
      {/* Header Soberano */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-12">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-black uppercase tracking-[0.2em] mb-6">
             <GraduationCap size={12} /> Academia de Elite
          </div>
          <h1 className="text-4xl font-black text-ink-primary tracking-tighter sm:text-6xl font-display leading-[0.95]">
            Módulos de <span className="text-accent italic">Aptidão.</span>
          </h1>
          <p className="text-ink-secondary mt-6 text-lg font-medium leading-relaxed">
            Desenvolve as competências exigidas pelo mercado mundial. O teu progresso alimenta diretamente o teu Perfil Vocacional.
          </p>
        </div>
      </header>

      <CatalogoGridShell
        isLoading={isLoading}
        isEmpty={cursos.length === 0}
        onClearFilters={() => { setSearch(''); setArea(''); }}
        filterBar={
          <CatalogoFilterBar
            searchTerm={search}
            onSearchChange={setSearch}
            areas={AREAS}
            selectedArea={area}
            onAreaChange={setArea}
            totalResults={data?.pagination?.total}
          />
        }
      >
        {cursos.map((c) => (
          <ContentCard
            key={c.id}
            title={c.titulo}
            subtitle={c.instituicaoNome || c.instituicao?.nome || 'PDC Partner'}
            image={c.capaUrl || undefined}
            href={`/app/cursos/${c.id}`}
            badges={[{ label: 'Certificação PDC', variant: 'accent' }]}
            footerInfo={[
              { icon: Clock, label: `${String(c.totalHoras || 0)}h` },
              { icon: Users, label: `${String(c.inscritosCount || 0)} alunos` }
            ]}
          />
        ))}
      </CatalogoGridShell>
    </div>
  );
}
image={c.capaUrl || undefined}
            href={`/app/cursos/${c.id}`}
            badges={[{ label: 'Certificação PDC', variant: 'accent' }]}
            footerInfo={[
              { icon: Clock, label: `${String(c.totalHoras || 0)}h` },
              { icon: Users, label: `${String(c.inscritosCount || 0)} alunos` }
            ]}
          />
        ))}
      </CatalogoGridShell>
    </div>
  );
}

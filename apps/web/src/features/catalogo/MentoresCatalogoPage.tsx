import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { catalogoApi } from '@/lib/api/catalogo';
import { SEOHead } from '@/components/layout/SEOHead';
import CatalogoGridShell from '@/components/catalogo/CatalogoGridShell';
import CatalogoFilterBar from '@/components/catalogo/CatalogoFilterBar';
import ContentCard from '@/components/catalogo/ContentCard';
import { UserCheck, Star } from 'lucide-react';
import type { AreaVocacional, MentorPublico } from '@pdc/shared';

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

export function MentoresCatalogoPage() {
  const [sp, setSp] = useSearchParams();
  const area = sp.get('area') ?? '';
  const search = sp.get('q') ?? '';
  const page = Number(sp.get('page') ?? '1');

  const isValidArea = (val: string): val is AreaVocacional => AREAS.some((a) => a.value === val);

  const { data, isLoading } = useQuery({
    queryKey: ['catalogo-mentores', area, search, page],
    queryFn: () => catalogoApi.getMentores({
      ...(area && isValidArea(area) ? { area } : {}),
      ...(search ? { q: search } : {}),
      page,
      pageSize: 12,
    }),
  });

  const mentores = data?.data ?? [];

  return (
    <>
      <SEOHead
        title="Mentores"
        description="Encontra mentores de elite e profissionais da indústria para guiar o teu percurso."
        url="https://usepdc.com/mentores"
      />

      <div className="max-w-7xl mx-auto space-y-8">
        <header>
          <h1 className="text-2xl font-bold text-ink-primary">Mentores</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Conecta-te com profissionais experientes que partilham a visão de transformar o capital humano.
          </p>
        </header>

        <CatalogoGridShell
          isLoading={isLoading}
          isEmpty={mentores.length === 0}
          onClearFilters={() => { setSp(new URLSearchParams()); }}
          emptyTitle="Nenhum mentor nesta área"
          emptyDescription="Experimenta outra área ou aguarda novos mentores."
          filterBar={
            <CatalogoFilterBar
              areas={AREAS}
              selectedArea={area}
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
          {mentores.map((m: MentorPublico) => (
            <ContentCard
              key={m.id}
              title={m.nome}
              subtitle={m.areaEspecialidade || m.especialidade || 'Mentor PDC'}
              image={m.avatarUrl || undefined}
              href={`/mentores/${m.id}`}
              icon={UserCheck}
              badges={[
                { label: m.disponivel ? 'Disponível' : 'Ocupado', variant: m.disponivel ? 'success' : 'outline' },
              ]}
              footerInfo={[
                { icon: UserCheck, label: 'Mentor' },
                { icon: Star, label: m.areaEspecialidade || 'Elite' },
              ]}
            />
          ))}
        </CatalogoGridShell>
      </div>
    </>
  );
}

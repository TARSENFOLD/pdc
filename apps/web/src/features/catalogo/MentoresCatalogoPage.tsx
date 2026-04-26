import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { catalogoApi } from '@/lib/api/catalogo';
import { Spinner, Card, Pagination, Avatar } from '@/components/ui';
import { SEOHead } from '@/components/layout/SEOHead';
import type { MentorPublico, AreaVocacional } from '@pdc/shared';

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
];

function MentorCard({ mentor }: { mentor: MentorPublico }) {
  return (
    <Link to={`/mentores/${mentor.id}`} className="group">
      <Card interactive className="flex items-start gap-5 p-6 border-border bg-surface hover:border-amber/30 transition-all">
        <Avatar size="lg" {...(mentor.avatarUrl ? { src: mentor.avatarUrl } : {})} alt={mentor.nome} fallback={mentor.nome.substring(0, 2)} className="ring-2 ring-transparent group-hover:ring-amber/20 transition-all" />
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-text-primary group-hover:text-amber transition-colors line-clamp-1 text-lg">{mentor.nome}</h3>
          {mentor.areaEspecialidade ? (
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber mt-1">{mentor.areaEspecialidade}</p>
          ) : (
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mt-1">{mentor.especialidade}</p>
          )}
          {mentor.bio ? <p className="mt-3 text-sm text-text-muted line-clamp-2 leading-relaxed">{mentor.bio}</p> : null}
          <div className="mt-4 flex items-center justify-between">
            <div className={`h-2 w-2 rounded-full ${mentor.disponivel ? 'bg-emerald-500' : 'bg-text-muted'} shadow-[0_0_8px_rgba(16,185,129,0.4)]`} />
            <span className="text-xs font-bold text-amber">Conectar →</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export function MentoresCatalogoPage() {
  const [sp, setSp] = useSearchParams();
  const area = sp.get('area') ?? '';
  const page = Number(sp.get('page') ?? '1');

  const { data, isLoading } = useQuery({
    queryKey: ['catalogo-mentores', area, page],
    queryFn: () => catalogoApi.getMentores({
      ...(area ? { area } : {}),
      page,
      pageSize: 12,
    }),
  });

  const mentores = data?.data ?? [];
  const pageCount = data?.meta.pageCount ?? 1;

  const set = (k: string, v: string) => {
    const next = new URLSearchParams(sp);
    if (v) next.set(k, v); else next.delete(k);
    if (k !== 'page') next.delete('page');
    setSp(next, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background px-4 py-20 sm:px-8">
      <SEOHead 
        title="Rede de Mentores" 
        description="Encontra mentores de elite e profissionais da indústria para guiar o teu percurso." 
        url="https://usepdc.com/mentores" 
      />
      
      <div className="mx-auto max-w-7xl">
        <header className="mb-12">
          <div className="inline-flex items-center rounded-full bg-surface-raised px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber border border-border mb-4">
            👨‍🏫 Mentoria de Elite
          </div>
          <h1 className="text-4xl font-black tracking-tight text-text-primary sm:text-5xl">Mestres da Indústria.</h1>
          <p className="mt-4 text-lg text-text-secondary max-w-2xl">
            Conecta-te com profissionais experientes que partilham a visão de transformar o capital humano global.
          </p>
        </header>

        <div className="sticky top-20 z-10 bg-background/80 backdrop-blur-xl pt-2 pb-6 border-b border-border/50 mb-8 overflow-hidden">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <span className="text-[10px] font-black uppercase tracking-tighter text-text-muted mr-2">Especialidade:</span>
            {AREAS.map((a) => (
              <button 
                key={a.value} 
                onClick={() => { set('area', area === a.value ? '' : a.value); }}
                className={`flex-none rounded-full border px-4 py-1.5 text-xs font-bold transition-all ${area === a.value ? 'bg-amber border-amber text-white shadow-lg shadow-amber/20' : 'bg-surface-raised border-border text-text-secondary hover:border-amber/30'}`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Spinner size="lg" />
            <p className="text-sm font-mono uppercase tracking-widest text-amber animate-pulse">Sincronizando Mentores...</p>
          </div>
        ) : mentores.length === 0 ? (
          <div className="py-24 text-center rounded-3xl border border-dashed border-border bg-surface-alt">
            <h3 className="text-lg font-bold text-text-primary">Nenhum mentor disponível nesta área</h3>
            <p className="mt-2 text-sm text-text-secondary">Explora outras especialidades ou limpa os filtros.</p>
            <button onClick={() => { setSp(new URLSearchParams()); }} className="mt-6 text-xs font-bold uppercase tracking-widest text-amber hover:underline">Ver Todos</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {mentores.map((m) => <MentorCard key={m.id} mentor={m} />)}
            </div>
            {pageCount > 1 && (
              <div className="mt-16 flex justify-center border-t border-border pt-10">
                <Pagination page={page} pageCount={pageCount} onPageChange={(p) => { set('page', String(p)); }} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

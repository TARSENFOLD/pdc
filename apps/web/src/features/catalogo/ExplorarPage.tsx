import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { catalogoApi } from '@/lib/api/catalogo';
import { Card, Pagination, Avatar } from '@/components/ui';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { AspirationalEmpty } from '@/components/ui/AspirationalEmpty';
import { CardGridSkeleton } from '@/components/ui/Skeleton';
import { SEOHead } from '@/components/layout/SEOHead';
import { SearchX } from 'lucide-react';
import type { ExplorarResultado, ExplorarItem, MentorPublico, AreaVocacional } from '@pdc/shared';

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

const CTA_LABELS: Record<string, string> = {
  curso: 'Ver curso',
  simulacao: 'Experimentar',
  experiencia: 'Ver experiência',
  mentor: 'Conectar',
  instituicao: 'Ver instituição',
};

const EXPLORAR_TIPOS = ['curso', 'simulacao', 'experiencia', 'mentor', 'instituicao'] as const satisfies readonly ExplorarItem['tipo'][];

function ResultCard({ item }: { item: ExplorarItem }) {
  const slug = item.slug;
  const linkMap: Record<string, string> = {
    curso: `/cursos/${slug}`,
    simulacao: `/simulacoes/${slug}`,
    experiencia: `/experiencias/${item.id}`,
    mentor: `/mentores/${item.id}`,
    instituicao: `/instituicoes/${slug}`,
  };
  return (
    <Link to={linkMap[item.tipo] ?? '#'}>
      <Card interactive className="p-5 border-ink-tertiary/10 bg-elevated hover:border-accent/30 transition-all">
        {item.capaUrl ? (
          <img src={item.capaUrl} alt={item.titulo} className="mb-4 h-40 w-full rounded-xl object-cover shadow-sm" loading="lazy" />
        ) : (
          <div className="mb-4 h-40 w-full rounded-xl bg-gradient-to-br from-accent/10 via-recessed to-elevated flex items-center justify-center">
            <span className="text-[10px] font-medium text-accent/40 uppercase tracking-widest">{item.tipo}</span>
          </div>
        )}
        <span className="text-[10px] font-bold uppercase tracking-widest text-accent">{item.tipo}</span>
        <h3 className="mt-1 font-bold text-ink-primary line-clamp-1 text-lg">{item.titulo}</h3>
        {item.descricao ? <p className="mt-2 text-sm text-ink-tertiary line-clamp-2 leading-relaxed">{item.descricao}</p> : null}
        <div className="mt-4 flex items-center justify-between">
          {item.area ? (
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-ink-secondary border border-ink-tertiary/10">
              {item.area}
            </span>
          ) : <span />}
          <span className="text-xs font-bold text-accent group-hover:translate-x-1 transition-transform">
            {CTA_LABELS[item.tipo] ?? 'Ver'} →
          </span>
        </div>
      </Card>
    </Link>
  );
}

function PessoasSugeridas({ mentores }: { mentores: MentorPublico[] }) {
  if (mentores.length === 0) return null;
  return (
    <div className="mt-16 rounded-3xl border border-ink-tertiary/10 bg-elevated p-8 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-ink-primary">Talentos em destaque</h2>
          <p className="text-sm text-ink-tertiary">Mentores e profissionais de elite prontos para te guiar.</p>
        </div>
        <Link to="/explorar?tipo=mentor" className="text-sm font-bold text-accent hover:underline">Ver todos</Link>
      </div>
      <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
        {mentores.slice(0, 8).map((m) => (
          <Link key={m.id} to={`/mentores/${m.id}`} className="group flex w-44 flex-none flex-col items-center rounded-2xl border border-ink-tertiary/10 bg-elevated p-6 text-center transition-all hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5">
            <Avatar size="xl" {...(m.avatarUrl ? { src: m.avatarUrl } : {})} alt={m.nome} fallback={m.nome.substring(0, 2)} className="ring-2 ring-transparent group-hover:ring-accent/20 transition-all" />
            <p className="mt-4 text-sm font-bold text-ink-primary line-clamp-1 group-hover:text-accent transition-colors">{m.nome}</p>
            {m.areaEspecialidade ? <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-ink-tertiary line-clamp-1">{m.areaEspecialidade}</p> : null}
            <div className="mt-4 rounded-full bg-accent/10 px-3 py-1 text-[10px] font-bold text-accent">Conectar</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function ExplorarPage() {
  const [sp, setSearchParams] = useSearchParams();
  const tab = sp.get('tipo') ?? 'tudo';
  const search = sp.get('search') ?? '';
  const area = sp.get('area') ?? '';
  const page = Number(sp.get('page') ?? '1');
  const selectedTipo = EXPLORAR_TIPOS.find((tipo) => tipo === tab);

  const { data, isLoading } = useQuery<ExplorarResultado>({
    queryKey: ['explorar', tab, search, area, page],
    queryFn: () => catalogoApi.explorar({
      ...(selectedTipo ? { tipo: selectedTipo } : {}),
      ...(search ? { search } : {}),
      ...(area ? { area: area as AreaVocacional } : {}),
      page,
      pageSize: 12,
    }),
  });

  const { data: mentoresData } = useQuery<{ data: MentorPublico[] }>({
    queryKey: ['explorar-pessoas'],
    queryFn: () => catalogoApi.getMentores({ pageSize: 8 }),
  });

  const items = data?.data ?? [];
  const pageCount = data?.meta.pageCount ?? 1;

  const setFilter = (k: string, v: string) => {
    const next = new URLSearchParams(sp);
    if (v) next.set(k, v); else next.delete(k);
    if (k !== 'page') next.delete('page');
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="min-h-screen bg-canvas">
      <SEOHead
        title="Explorar"
        description="Descobre cursos, simulações e mentores na plataforma PDC."
        url="https://usepdc.com/explorar"
      />

      <div className="mx-auto max-w-7xl">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-ink-primary">Explorar</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Cursos certificados, simulações e mentores da rede PDC.
          </p>
        </header>

        <div className="sticky top-20 z-10 bg-canvas/80 backdrop-blur-xl pt-2 pb-6 border-b border-ink-tertiary/10">
          <div className="flex flex-col gap-4">
            <div className="relative group">
              <input
                type="text" 
                value={search} 
                placeholder="Pesquisar carreiras, simulações ou mentores..."
                onChange={(e) => { setFilter('search', e.target.value); }}
                className="w-full rounded-2xl border border-ink-tertiary/10 bg-elevated p-4 pl-12 text-sm text-ink-primary placeholder:text-ink-tertiary focus:border-accent/40 focus:ring-4 focus:ring-accent/5 outline-none transition-all"
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-tertiary group-focus-within:text-accent transition-colors">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <span className="text-[10px] font-medium uppercase tracking-widest text-ink-tertiary mr-2">Área:</span>
              {AREAS.map((a) => (
                <button 
                  key={a.value} 
                  onClick={() => { setFilter('area', area === a.value ? '' : a.value); }}
                  className={`flex-none rounded-full border px-4 py-1.5 text-xs font-bold transition-all ${area === a.value ? 'bg-accent border-accent text-white shadow-lg shadow-accent/20' : 'bg-elevated border-ink-tertiary/10 text-ink-secondary hover:border-accent/30'}`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => { setFilter('tipo', v === 'tudo' ? '' : v); }} className="mt-8">
          <TabsList className="bg-elevated p-1 rounded-2xl border border-ink-tertiary/10">
            {['tudo', ...EXPLORAR_TIPOS].map((t) => (
              <TabsTrigger key={t} value={t} className="rounded-xl px-6 py-2 text-xs font-bold uppercase tracking-widest transition-all data-[state=active]:bg-accent data-[state=active]:text-white">
                {t === 'tudo' ? 'Tudo' : `${t}s`}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={tab} className="mt-8">
            {isLoading ? (
              <CardGridSkeleton />
            ) : items.length === 0 ? (
              <AspirationalEmpty
                icon={SearchX}
                title="Nenhum resultado para esta pesquisa"
                description="Experimenta outra área ou limpa os filtros."
                action={
                  <Link
                    to="/explorar"
                    onClick={() => { setSearchParams(new URLSearchParams()); }}
                    className="text-xs font-semibold text-accent hover:underline uppercase tracking-widest"
                  >
                    Limpar tudo
                  </Link>
                }
              />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {items.map((item) => <ResultCard key={`${item.tipo}-${item.id}`} item={item} />)}
                </div>
                {pageCount > 1 && (
                  <div className="mt-16 flex justify-center border-t border-ink-tertiary/10 pt-10">
                    <Pagination page={page} pageCount={pageCount} onPageChange={(p) => { setFilter('page', String(p)); }} />
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>

        <PessoasSugeridas mentores={mentoresData?.data ?? []} />
      </div>
    </div>
  );
}

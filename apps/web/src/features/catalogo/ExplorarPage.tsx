import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { catalogoApi } from '@/lib/api/catalogo';
import { Spinner, Card, Pagination, Avatar } from '@/components/ui';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { SEOHead } from '@/components/layout/SEOHead';
import type { ExplorarResultado, MentorPublico, AreaVocacional } from '@pdc/shared';

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

const CTA_LABELS: Record<string, string> = {
  curso: 'Ver curso',
  simulacao: 'Experimentar',
  experiencia: 'Ver experiência',
  mentor: 'Conectar',
  instituicao: 'Ver instituição',
};

function ResultCard({ item }: { item: ExplorarResultado }) {
  const slug = item.slug ?? item.id;
  const linkMap: Record<string, string> = {
    curso: `/cursos/${slug}`,
    simulacao: `/simulacoes/${slug}`,
    experiencia: `/experiencias/${item.id}`,
    mentor: `/mentores/${item.id}`,
    instituicao: `/instituicoes/${slug}`,
  };
  return (
    <Link to={linkMap[item.tipo] ?? '#'}>
      <Card interactive className="p-5 border-border bg-surface hover:border-amber/30 transition-all">
        {item.capaUrl ? (
          <img src={item.capaUrl} alt={item.titulo} className="mb-4 h-40 w-full rounded-xl object-cover shadow-sm" />
        ) : (
          <div className="mb-4 h-40 w-full rounded-xl bg-surface-raised flex items-center justify-center text-text-muted">
            Sem capa
          </div>
        )}
        <span className="text-[10px] font-bold uppercase tracking-widest text-amber">{item.tipo}</span>
        <h3 className="mt-1 font-bold text-text-primary line-clamp-1 text-lg">{item.titulo}</h3>
        {item.descricao ? <p className="mt-2 text-sm text-text-muted line-clamp-2 leading-relaxed">{item.descricao}</p> : null}
        <div className="mt-4 flex items-center justify-between">
          {item.area ? (
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-text-secondary border border-border">
              {item.area}
            </span>
          ) : <span />}
          <span className="text-xs font-bold text-amber group-hover:translate-x-1 transition-transform">
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
    <div className="mt-16 rounded-3xl border border-border bg-surface p-8 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Talentos em destaque</h2>
          <p className="text-sm text-text-muted">Mentores e profissionais de elite prontos para te guiar.</p>
        </div>
        <Link to="/explorar?tipo=mentor" className="text-sm font-bold text-amber hover:underline">Ver todos</Link>
      </div>
      <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
        {mentores.slice(0, 8).map((m) => (
          <Link key={m.id} to={`/mentores/${m.id}`} className="group flex w-44 flex-none flex-col items-center rounded-2xl border border-border bg-surface-raised p-6 text-center transition-all hover:border-amber/40 hover:shadow-lg hover:shadow-amber/5">
            <Avatar size="xl" {...(m.avatarUrl ? { src: m.avatarUrl } : {})} alt={m.nome} fallback={m.nome.substring(0, 2)} className="ring-2 ring-transparent group-hover:ring-amber/20 transition-all" />
            <p className="mt-4 text-sm font-bold text-text-primary line-clamp-1 group-hover:text-amber transition-colors">{m.nome}</p>
            {m.areaEspecialidade ? <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-text-muted line-clamp-1">{m.areaEspecialidade}</p> : null}
            <div className="mt-4 rounded-full bg-amber/10 px-3 py-1 text-[10px] font-bold text-amber">Conectar</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function ExplorarPage() {
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tipo') ?? 'tudo';
  const search = sp.get('search') ?? '';
  const area = sp.get('area') ?? '';
  const page = Number(sp.get('page') ?? '1');

  const { data, isLoading } = useQuery<{ data: ExplorarResultado[]; meta: { pageCount: number } }>({
    queryKey: ['explorar', tab, search, area, page],
    queryFn: () => catalogoApi.explorar({
      ...(tab !== 'tudo' ? { tipo: tab } : {}),
      ...(search ? { search } : {}),
      ...(area ? { area } : {}),
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

  const set = (k: string, v: string) => {
    const next = new URLSearchParams(sp);
    if (v) next.set(k, v); else next.delete(k);
    if (k !== 'page') next.delete('page');
    setSp(next, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background px-4 py-20 sm:px-8">
      <SEOHead 
        title="Explorar Catálogo" 
        description="Descobre cursos, simulações e mentores na infraestrutura de decisão PDC." 
        url="https://usepdc.com/explorar" 
      />
      
      <div className="mx-auto max-w-7xl">
        <header className="mb-12">
          <div className="inline-flex items-center rounded-full bg-surface-raised px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber border border-border mb-4">
            🔍 Inteligência Coletiva
          </div>
          <h1 className="text-4xl font-black tracking-tight text-text-primary sm:text-5xl">Explorar <span className="text-amber">PDC.</span></h1>
          <p className="mt-4 text-lg text-text-secondary max-w-2xl">
            Acede a simulações de alto impacto, cursos certificados e mentoria de elite. O teu futuro começa aqui.
          </p>
        </header>

        <div className="sticky top-20 z-10 bg-background/80 backdrop-blur-xl pt-2 pb-6 border-b border-border/50">
          <div className="flex flex-col gap-4">
            <div className="relative group">
              <input
                type="text" 
                value={search} 
                placeholder="Pesquisar carreiras, simulações ou mentores..."
                onChange={(e) => { set('search', e.target.value); }}
                className="w-full rounded-2xl border border-border bg-surface p-4 pl-12 text-sm text-text-primary placeholder:text-text-muted focus:border-amber/40 focus:ring-4 focus:ring-amber/5 outline-none transition-all"
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-amber transition-colors">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <span className="text-[10px] font-black uppercase tracking-tighter text-text-muted mr-2">Filtros:</span>
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
        </div>

        <Tabs value={tab} onValueChange={(v) => { set('tipo', v === 'tudo' ? '' : v); }} className="mt-8">
          <TabsList className="bg-surface p-1 rounded-2xl border border-border">
            {['tudo', 'curso', 'simulacao', 'experiencia', 'mentor', 'instituicao'].map((t) => (
              <TabsTrigger key={t} value={t} className="rounded-xl px-6 py-2 text-xs font-bold uppercase tracking-widest transition-all data-[state=active]:bg-amber data-[state=active]:text-white">
                {t === 'tudo' ? 'Tudo' : `${t}s`}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={tab} className="mt-8">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <Spinner size="lg" />
                <p className="text-sm font-mono uppercase tracking-widest text-amber animate-pulse">Sincronizando Catálogos...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="py-24 text-center rounded-3xl border border-dashed border-border bg-surface-alt">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-text-muted">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 7 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className="text-lg font-bold text-text-primary">Nenhum resultado encontrado</h3>
                <p className="mt-2 text-sm text-text-secondary">Tenta ajustar os teus filtros ou pesquisa.</p>
                <Link to="/explorar" onClick={() => { setSp(new URLSearchParams()); }} className="mt-6 inline-block text-xs font-bold uppercase tracking-widest text-amber hover:underline">Limpar tudo</Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {items.map((item) => <ResultCard key={`${item.tipo}-${item.id}`} item={item} />)}
                </div>
                {pageCount > 1 && (
                  <div className="mt-16 flex justify-center border-t border-border pt-10">
                    <Pagination page={page} pageCount={pageCount} onPageChange={(p) => { set('page', String(p)); }} />
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

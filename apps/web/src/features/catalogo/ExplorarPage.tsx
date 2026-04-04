import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { catalogoApi } from '@/lib/api/catalogo';
import { Spinner, Card, Pagination, Avatar } from '@/components/ui';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import type { ExplorarResultado, MentorPublico } from '@pdc/shared';

const AREAS = ['Tecnologia', 'Saúde', 'Engenharia', 'Direito', 'Gestão', 'Educação', 'Artes'];

const CTA_LABELS: Record<string, string> = {
  curso: 'Ver curso', simulacao: 'Experimentar', experiencia: 'Ver experiência',
  mentor: 'Conectar', instituicao: 'Ver instituição',
};

function ResultCard({ item }: { item: ExplorarResultado }) {
  const slug = item.slug ?? item.id;
  const linkMap: Record<string, string> = {
    curso: `/cursos/${slug}`, simulacao: `/simulacoes/${slug}`,
    experiencia: `/experiencias/${item.id}`, mentor: `/mentores/${item.id}`,
    instituicao: `/instituicoes/${slug}`,
  };
  return (
    <Link to={linkMap[item.tipo] ?? '#'}>
      <Card interactive className="p-5">
        {item.capaUrl ? <img src={item.capaUrl} alt={item.titulo} className="mb-3 h-32 w-full rounded-lg object-cover" /> : null}
        <span className="text-[10px] font-bold uppercase tracking-widest text-amber">{item.tipo}</span>
        <h3 className="mt-1 font-semibold text-text-primary line-clamp-1">{item.titulo}</h3>
        {item.descricao ? <p className="mt-1 text-xs text-text-muted line-clamp-2">{item.descricao}</p> : null}
        <div className="mt-3 flex items-center justify-between">
          {item.area ? <span className="text-xs text-text-secondary">{item.area}</span> : <span />}
          <span className="text-xs font-medium text-amber">{CTA_LABELS[item.tipo] ?? 'Ver'} →</span>
        </div>
      </Card>
    </Link>
  );
}

function PessoasSugeridas({ mentores }: { mentores: MentorPublico[] }) {
  if (mentores.length === 0) return null;
  return (
    <div className="mt-12 rounded-xl border border-border bg-surface p-6">
      <h2 className="text-lg font-semibold text-text-primary">Pessoas que podes seguir</h2>
      <p className="mt-1 text-sm text-text-muted">Mentores e profissionais disponíveis na plataforma.</p>
      <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
        {mentores.slice(0, 6).map((m) => (
          <Link key={m.id} to={`/mentores/${m.id}`} className="flex w-36 flex-none flex-col items-center rounded-xl border border-border bg-surface-raised p-4 text-center transition-colors hover:border-amber/30">
            <Avatar size="lg" {...(m.avatarUrl ? { src: m.avatarUrl } : {})} alt={m.nome} fallback={m.nome.substring(0, 2)} />
            <p className="mt-2 text-sm font-medium text-text-primary line-clamp-1">{m.nome}</p>
            {m.areaEspecialidade ? <p className="text-xs text-text-muted line-clamp-1">{m.areaEspecialidade}</p> : null}
            <span className="mt-2 text-xs font-medium text-amber">Conectar →</span>
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

  const { data, isLoading } = useQuery({
    queryKey: ['explorar', tab, search, area, page],
    queryFn: () => catalogoApi.explorar({
      ...(tab !== 'tudo' ? { tipo: tab } : {}),
      ...(search ? { search } : {}),
      ...(area ? { area } : {}),
      page,
      pageSize: 12,
    }),
  });

  const { data: mentoresData } = useQuery({
    queryKey: ['explorar-pessoas'],
    queryFn: () => catalogoApi.getMentores({ pageSize: 6 }),
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
    <div className="min-h-screen bg-background px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">Explorar</h1>
        <p className="mt-2 text-text-muted">Descobre cursos, simulações, mentores e mais.</p>

        <input
          type="text" value={search} placeholder="Pesquisar..."
          onChange={(e) => { set('search', e.target.value); }}
          className="mt-6 w-full rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-amber/40 focus:outline-none"
        />

        <div className="mt-4 flex flex-wrap gap-2">
          {AREAS.map((a) => (
            <button key={a} onClick={() => { set('area', area === a ? '' : a); }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${area === a ? 'bg-amber text-black' : 'bg-surface-raised text-text-secondary hover:text-text-primary'}`}
            >{a}</button>
          ))}
        </div>

        <Tabs value={tab} onValueChange={(v) => { set('tipo', v === 'tudo' ? '' : v); }} className="mt-6">
          <TabsList>
            {['tudo', 'curso', 'simulacao', 'experiencia', 'mentor', 'instituicao'].map((t) => (
              <TabsTrigger key={t} value={t} className="capitalize">{t === 'tudo' ? 'Tudo' : `${t}s`}</TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={tab}>
            {isLoading ? (
              <div className="flex justify-center py-20"><Spinner size="lg" /></div>
            ) : items.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-text-muted">Nenhum resultado encontrado.</p>
                <Link to="/criar-conta" className="mt-4 inline-block text-sm text-amber hover:underline">Criar conta gratuita</Link>
              </div>
            ) : (
              <>
                <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((item) => <ResultCard key={`${item.tipo}-${item.id}`} item={item} />)}
                </div>
                {pageCount > 1 && <Pagination page={page} pageCount={pageCount} onPageChange={(p) => { set('page', String(p)); }} className="mt-10" />}
              </>
            )}
          </TabsContent>
        </Tabs>

        <PessoasSugeridas mentores={mentoresData?.data ?? []} />
      </div>
    </div>
  );
}

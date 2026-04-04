import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { catalogoApi } from '@/lib/api/catalogo';
import { Spinner, Card, Pagination, Badge } from '@/components/ui';
import type { SimulacaoPublica } from '@pdc/shared';

const AREAS = ['Tecnologia', 'Saúde', 'Engenharia', 'Direito', 'Gestão', 'Educação', 'Artes'];
const TIPOS: Record<string, string> = { '1': 'Vídeo', '2': 'Laboratório', '3': 'Interactivo' };
const NIVEIS = ['Básico', 'Intermédio', 'Avançado'];

function SimCard({ sim }: { sim: SimulacaoPublica }) {
  const tipoLabel = TIPOS[String(sim.tipo)] ?? 'Simulação';
  return (
    <Link to={`/simulacoes/${sim.slug ?? sim.id}`}>
      <Card interactive className="p-5">
        {sim.capaUrl ? <img src={sim.capaUrl} alt={sim.titulo} className="mb-3 h-32 w-full rounded-lg object-cover" /> : null}
        <div className="flex gap-2">
          <Badge variant="warning">{tipoLabel}</Badge>
          {sim.area ? <Badge variant="info">{sim.area}</Badge> : null}
          {sim.nivel ? <Badge variant="outline">{sim.nivel}</Badge> : null}
        </div>
        <h3 className="mt-2 font-semibold text-text-primary line-clamp-1">{sim.titulo}</h3>
        <p className="mt-1 text-xs text-text-muted line-clamp-2">{sim.descricao}</p>
        <div className="mt-3 text-right">
          <span className="text-xs font-medium text-amber">Experimentar →</span>
        </div>
      </Card>
    </Link>
  );
}

export function SimulacoesCatalogoPage() {
  const [sp, setSp] = useSearchParams();
  const area = sp.get('area') ?? '';
  const tipo = sp.get('tipo') ?? '';
  const nivel = sp.get('nivel') ?? '';
  const page = Number(sp.get('page') ?? '1');

  const { data, isLoading } = useQuery({
    queryKey: ['catalogo-simulacoes', area, tipo, nivel, page],
    queryFn: () => catalogoApi.getSimulacoes({
      ...(area ? { area } : {}),
      ...(tipo ? { tipo } : {}),
      ...(nivel ? { nivel } : {}),
      page, pageSize: 12,
    }),
  });

  const sims = data?.data ?? [];
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
        <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">Simulações</h1>
        <p className="mt-2 text-text-muted">Experimenta profissões antes de decidir.</p>

        <div className="mt-6 flex flex-wrap gap-2">
          {AREAS.map((a) => (
            <button key={a} onClick={() => { set('area', area === a ? '' : a); }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${area === a ? 'bg-amber text-black' : 'bg-surface-raised text-text-secondary hover:text-text-primary'}`}
            >{a}</button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(TIPOS).map(([k, v]) => (
            <button key={k} onClick={() => { set('tipo', tipo === k ? '' : k); }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${tipo === k ? 'bg-amber text-black' : 'bg-surface-raised text-text-secondary hover:text-text-primary'}`}
            >{v}</button>
          ))}
          {NIVEIS.map((n) => (
            <button key={n} onClick={() => { set('nivel', nivel === n ? '' : n); }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${nivel === n ? 'bg-info text-white' : 'bg-surface-raised text-text-secondary hover:text-text-primary'}`}
            >{n}</button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : sims.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-text-muted">Nenhuma simulação encontrada.</p>
            <Link to="/criar-conta" className="mt-4 inline-block text-sm text-amber hover:underline">Criar conta gratuita</Link>
          </div>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {sims.map((s) => <SimCard key={s.id} sim={s} />)}
            </div>
            {pageCount > 1 && <Pagination page={page} pageCount={pageCount} onPageChange={(p) => { set('page', String(p)); }} className="mt-10" />}
          </>
        )}
      </div>
    </div>
  );
}

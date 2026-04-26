import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { catalogoApi } from '@/lib/api/catalogo';
import { Spinner, Card, Pagination, Badge } from '@/components/ui';
import { SEOHead } from '@/components/layout/SEOHead';
import type { SimulacaoPublica, AreaVocacional } from '@pdc/shared';

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

const TIPOS: Record<string, string> = { 
  '1': 'Vídeo Imersivo', 
  '2': 'Laboratório Técnico', 
  '3': 'Interativo Dinâmico' 
};

const NIVEIS = ['Básico', 'Intermédio', 'Avançado'];

function SimCard({ sim }: { sim: SimulacaoPublica }) {
  const tipoLabel = TIPOS[String(sim.tipo)] ?? 'Simulação';
  return (
    <Link to={`/simulacoes/${String(sim.slug ?? sim.id)}`} className="group">
      <Card interactive className="p-5 border-border bg-surface hover:border-amber/30 transition-all">
        {sim.capaUrl ? (
          <img src={sim.capaUrl} alt={sim.titulo} className="mb-4 h-40 w-full rounded-xl object-cover shadow-sm" />
        ) : (
          <div className="mb-4 h-40 w-full rounded-xl bg-surface-raised flex items-center justify-center text-text-muted">
            Sem capa
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Badge variant="warning" className="text-[10px] uppercase font-bold tracking-tighter">{tipoLabel}</Badge>
          <Badge variant="info" className="text-[10px] uppercase font-bold">{sim.area}</Badge>
          {sim.nivel ? <Badge variant="outline" className="text-[10px] uppercase font-bold">{sim.nivel}</Badge> : null}
        </div>
        <h3 className="font-bold text-text-primary group-hover:text-amber transition-colors line-clamp-1 text-lg">{sim.titulo}</h3>
        <p className="mt-2 text-sm text-text-muted line-clamp-2 leading-relaxed">{sim.descricao}</p>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Telemetria Ativa</span>
          <span className="text-xs font-bold text-amber group-hover:translate-x-1 transition-transform">Experimentar →</span>
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

  const { data, isLoading } = useQuery<{ data: SimulacaoPublica[]; meta: { pageCount: number } }>({
    queryKey: ['catalogo-simulacoes', area, tipo, nivel, page],
    queryFn: () => catalogoApi.getSimulacoes({
      ...(area ? { area } : {}),
      ...(tipo ? { tipo } : {}),
      ...(nivel ? { nivel } : {}),
      page,
      pageSize: 12,
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
    <div className="min-h-screen bg-background px-4 py-20 sm:px-8">
      <SEOHead 
        title="Catálogo de Simulações" 
        description="Experimenta profissões reais e testa as tuas aptidões com simulações de alto impacto." 
        url="https://usepdc.com/simulacoes" 
      />
      
      <div className="mx-auto max-w-7xl">
        <header className="mb-12">
          <div className="inline-flex items-center rounded-full bg-surface-raised px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-warning border border-border mb-4">
            ⚡ Decisão Baseada em Dados
          </div>
          <h1 className="text-4xl font-black tracking-tight text-text-primary sm:text-5xl">Simulações Práticas.</h1>
          <p className="mt-4 text-lg text-text-secondary max-w-2xl">
            Não escolhas um curso por intuição. Vive o dilema real da profissão e recebe um diagnóstico de precisão sobre a tua aptidão e fluidez.
          </p>
        </header>

        <div className="sticky top-20 z-10 bg-background/80 backdrop-blur-xl pt-2 pb-6 border-b border-border/50 mb-8">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <span className="text-[10px] font-black uppercase tracking-tighter text-text-muted mr-2">Áreas:</span>
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

            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-tighter text-text-muted">Método:</span>
                {Object.entries(TIPOS).map(([k, v]) => (
                  <button key={k} onClick={() => { set('tipo', tipo === k ? '' : k); }}
                    className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase transition-all ${tipo === k ? 'bg-warning border-warning text-black' : 'bg-surface-raised border-border text-text-secondary hover:text-text-primary'}`}
                  >{v}</button>
                ))}
              </div>
              <div className="h-4 w-px bg-border hidden sm:block" />
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-tighter text-text-muted">Nível:</span>
                {NIVEIS.map((n) => (
                  <button key={n} onClick={() => { set('nivel', nivel === n ? '' : n); }}
                    className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase transition-all ${nivel === n ? 'bg-info border-info text-white' : 'bg-surface-raised border-border text-text-secondary hover:text-text-primary'}`}
                  >{n}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Spinner size="lg" />
            <p className="text-sm font-mono uppercase tracking-widest text-warning animate-pulse">Sincronizando Simuladores...</p>
          </div>
        ) : sims.length === 0 ? (
          <div className="py-24 text-center rounded-3xl border border-dashed border-border bg-surface-alt">
            <h3 className="text-lg font-bold text-text-primary">Nenhuma simulação ativa</h3>
            <p className="mt-2 text-sm text-text-secondary">Tenta ajustar os filtros de área ou método.</p>
            <button onClick={() => { setSp(new URLSearchParams()); }} className="mt-6 text-xs font-bold uppercase tracking-widest text-amber hover:underline">Limpar Filtros</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sims.map((s) => <SimCard key={s.id} sim={s} />)}
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

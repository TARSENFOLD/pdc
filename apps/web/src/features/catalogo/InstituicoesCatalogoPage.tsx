import { useQuery } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { catalogoApi } from '@/lib/api/catalogo';
import { Spinner, Card, Pagination, Badge } from '@/components/ui';
import { SEOHead } from '@/components/layout/SEOHead';
import type { InstituicaoPublica } from '@pdc/shared';

const TIPOS = [
  { value: 'universidade', label: 'Universidade' },
  { value: 'escola_tecnica', label: 'Escola Técnica' },
  { value: 'centro_formacao', label: 'Centro de Formação' },
  { value: 'outro', label: 'Outro' }
];

const REGIOES = [
  'Bengo', 'Benguela', 'Bié', 'Cabinda', 'Cuando Cubango', 'Cuanza Norte', 
  'Cuanza Sul', 'Cunene', 'Huambo', 'Huíla', 'Luanda', 'Lunda Norte', 
  'Lunda Sul', 'Malanje', 'Moxico', 'Namibe', 'Uíge', 'Zaire'
];

function InstCard({ inst }: { inst: InstituicaoPublica }) {
  return (
    <Link to={`/instituicoes/${inst.slug ?? inst.id}`} className="group">
      <Card interactive className="p-6 border-border bg-surface hover:border-amber/30 transition-all h-full flex flex-col">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 shrink-0 flex items-center justify-center rounded-2xl bg-surface-raised border border-border group-hover:border-amber/20 transition-all overflow-hidden">
            {inst.logoUrl ? (
              <img src={inst.logoUrl} alt={inst.nome} className="h-full w-full object-contain p-2" />
            ) : (
              <Building2 size={32} className="text-text-muted group-hover:text-amber transition-colors" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-text-primary group-hover:text-amber transition-colors line-clamp-1 text-lg leading-tight">{inst.nome}</h3>
            <div className="flex flex-wrap gap-2 mt-2">
              {inst.tipo ? <Badge variant="info" className="text-[9px] uppercase font-bold px-2 py-0">{inst.tipo}</Badge> : null}
              {inst.regiao ? <Badge variant="outline" className="text-[9px] uppercase font-bold px-2 py-0 border-border text-text-muted">{inst.regiao}</Badge> : null}
            </div>
          </div>
        </div>
        {inst.descricao ? <p className="mt-4 text-sm text-text-muted line-clamp-3 leading-relaxed flex-1">{inst.descricao}</p> : <div className="flex-1" />}
        <div className="mt-6 flex items-center justify-end border-t border-border pt-4">
          <span className="text-xs font-bold text-amber group-hover:translate-x-1 transition-transform">Ver instituição →</span>
        </div>
      </Card>
    </Link>
  );
}

export function InstituicoesCatalogoPage() {
  const [sp, setSp] = useSearchParams();
  const tipo = sp.get('tipo') ?? '';
  const regiao = sp.get('regiao') ?? '';
  const page = Number(sp.get('page') ?? '1');

  const { data, isLoading } = useQuery({
    queryKey: ['catalogo-instituicoes', tipo, regiao, page],
    queryFn: () => catalogoApi.getInstituicoes({
      ...(tipo ? { tipo } : {}),
      ...(regiao ? { regiao } : {}),
      page,
      pageSize: 12,
    }),
  });

  const insts = data?.data ?? [];
  const pageCount = data?.meta?.pageCount ?? 1;

  const set = (k: string, v: string) => {
    const next = new URLSearchParams(sp);
    if (v) next.set(k, v); else next.delete(k);
    if (k !== 'page') next.delete('page');
    setSp(next, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background px-4 py-20 sm:px-8">
      <SEOHead 
        title="Instituições de Ensino" 
        description="Explora as melhores universidades, institutos e centros de formação parceiros do PDC." 
        url="https://usepdc.com/instituicoes" 
      />
      
      <div className="mx-auto max-w-7xl">
        <header className="mb-12">
          <div className="inline-flex items-center rounded-full bg-surface-raised px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber border border-border mb-4">
            🏛️ Ecossistema Académico
          </div>
          <h1 className="text-4xl font-black tracking-tight text-text-primary sm:text-5xl">Parceiros de Futuro.</h1>
          <p className="mt-4 text-lg text-text-secondary max-w-2xl">
            A PDC colabora com as instituições mais inovadoras para garantir que o teu percurso académico seja validado e reconhecido.
          </p>
        </header>

        <div className="sticky top-20 z-10 bg-background/80 backdrop-blur-xl pt-2 pb-6 border-b border-border/50 mb-8 overflow-hidden">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <span className="text-[10px] font-black uppercase tracking-tighter text-text-muted mr-2">Tipo:</span>
              {TIPOS.map((t) => (
                <button 
                  key={t.value} 
                  onClick={() => { set('tipo', tipo === t.value ? '' : t.value); }}
                  className={`flex-none rounded-full border px-4 py-1.5 text-xs font-bold transition-all ${tipo === t.value ? 'bg-amber border-amber text-white shadow-lg shadow-amber/20' : 'bg-surface-raised border-border text-text-secondary hover:border-amber/30'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <span className="text-[10px] font-black uppercase tracking-tighter text-text-muted mr-2">Província:</span>
              {REGIOES.map((r) => (
                <button 
                  key={r} 
                  onClick={() => { set('regiao', regiao === r ? '' : r); }}
                  className={`flex-none rounded-full border px-4 py-1.5 text-xs font-bold transition-all ${regiao === r ? 'bg-info border-info text-white shadow-lg shadow-info/20' : 'bg-surface-raised border-border text-text-secondary hover:border-amber/30'}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Spinner size="lg" />
            <p className="text-sm font-mono uppercase tracking-widest text-amber animate-pulse">Mapeando Instituições...</p>
          </div>
        ) : insts.length === 0 ? (
          <div className="py-24 text-center rounded-3xl border border-dashed border-border bg-surface-alt">
            <h3 className="text-lg font-bold text-text-primary">Nenhuma instituição encontrada nestas condições</h3>
            <p className="mt-2 text-sm text-text-secondary">Tenta expandir a tua pesquisa para outras regiões ou tipos.</p>
            <button onClick={() => setSp(new URLSearchParams())} className="mt-6 text-xs font-bold uppercase tracking-widest text-amber hover:underline">Remover Filtros</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {insts.map((i) => <InstCard key={i.id} inst={i} />)}
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

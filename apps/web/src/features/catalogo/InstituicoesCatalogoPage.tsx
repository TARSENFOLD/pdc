import { useQuery } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { catalogoApi } from '@/lib/api/catalogo';
import { Spinner, Card, Pagination, Badge } from '@/components/ui';
import { SEOHead } from '@/components/layout/SEOHead';
import type { InstituicaoPublica } from '@pdc/shared';

const TIPOS = ['Universidade', 'Instituto', 'Escola', 'Centro de Formação'];
const REGIOES = ['Luanda', 'Benguela', 'Huambo', 'Huíla', 'Cabinda', 'Lunda Norte', 'Lunda Sul', 'Malanje', 'Uíge'];

function InstCard({ inst }: { inst: InstituicaoPublica }) {
  return (
    <Link to={`/instituicoes/${inst.slug ?? inst.id}`}>
      <Card interactive className="p-5">
        <div className="flex items-center gap-3">
          {inst.logoUrl ? (
            <img src={inst.logoUrl} alt={inst.nome} className="h-12 w-12 rounded-xl object-contain" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber/10 text-amber"><Building2 size={24} aria-hidden={true} /></div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-text-primary line-clamp-1">{inst.nome}</h3>
            <div className="flex gap-2">
              {inst.tipo ? <Badge variant="info">{inst.tipo}</Badge> : null}
              {inst.regiao ? <Badge variant="outline">{inst.regiao}</Badge> : null}
            </div>
          </div>
        </div>
        {inst.descricao ? <p className="mt-3 text-xs text-text-muted line-clamp-2">{inst.descricao}</p> : null}
        <div className="mt-3 text-right">
          <span className="text-xs font-medium text-amber">Ver instituição →</span>
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
      page, pageSize: 12,
    }),
  });

  const insts = data?.data ?? [];
  const pageCount = data?.meta.pageCount ?? 1;

  const set = (k: string, v: string) => {
    const next = new URLSearchParams(sp);
    if (v) next.set(k, v); else next.delete(k);
    if (k !== 'page') next.delete('page');
    setSp(next, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background px-4 py-16 sm:px-6">
      <SEOHead title="Instituições" description="Instituições de ensino parceiras da plataforma PDC." url="https://usepdc.com/instituicoes" />
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">Instituições</h1>
        <p className="mt-2 text-text-muted">Instituições de ensino parceiras da plataforma.</p>

        <div className="mt-6 flex flex-wrap gap-2">
          {TIPOS.map((t) => (
            <button key={t} onClick={() => { set('tipo', tipo === t ? '' : t); }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${tipo === t ? 'bg-amber text-black' : 'bg-surface-raised text-text-secondary hover:text-text-primary'}`}
            >{t}</button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {REGIOES.map((r) => (
            <button key={r} onClick={() => { set('regiao', regiao === r ? '' : r); }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${regiao === r ? 'bg-info text-white' : 'bg-surface-raised text-text-secondary hover:text-text-primary'}`}
            >{r}</button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : insts.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-text-muted">Nenhuma instituição encontrada.</p>
            <Link to="/criar-conta" className="mt-4 inline-block text-sm text-amber hover:underline">Criar conta gratuita</Link>
          </div>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {insts.map((i) => <InstCard key={i.id} inst={i} />)}
            </div>
            {pageCount > 1 && <Pagination page={page} pageCount={pageCount} onPageChange={(p) => { set('page', String(p)); }} className="mt-10" />}
          </>
        )}
      </div>
    </div>
  );
}

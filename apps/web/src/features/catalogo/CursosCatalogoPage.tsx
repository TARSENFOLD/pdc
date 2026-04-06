import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { catalogoApi } from '@/lib/api/catalogo';
import { Spinner, Card, Pagination, Badge } from '@/components/ui';
import { SEOHead } from '@/components/layout/SEOHead';
import type { CursoPublico } from '@pdc/shared';

const AREAS = ['Tecnologia', 'Saúde', 'Engenharia', 'Direito', 'Gestão', 'Educação', 'Artes'];
const NIVEIS = ['Básico', 'Intermédio', 'Avançado'];

function CursoCard({ curso }: { curso: CursoPublico }) {
  return (
    <Link to={`/cursos/${curso.slug}`}>
      <Card interactive className="p-5">
        {curso.capaUrl ? <img src={curso.capaUrl} alt={curso.titulo} className="mb-3 h-32 w-full rounded-lg object-cover" /> : null}
        <div className="flex items-center gap-2">
          {curso.area ? <Badge variant="info">{curso.area}</Badge> : null}
          {curso.nivel ? <Badge variant="outline">{curso.nivel}</Badge> : null}
          {curso.gratuito ? <Badge variant="success">Gratuito</Badge> : null}
        </div>
        <h3 className="mt-2 font-semibold text-text-primary line-clamp-1">{curso.titulo}</h3>
        <p className="mt-1 text-xs text-text-muted line-clamp-2">{curso.descricao}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-text-secondary">{curso.totalHoras}h · {curso.autorNome ?? 'PDC'}</span>
          <span className="text-xs font-medium text-amber">Ver curso →</span>
        </div>
      </Card>
    </Link>
  );
}

export function CursosCatalogoPage() {
  const [sp, setSp] = useSearchParams();
  const area = sp.get('area') ?? '';
  const nivel = sp.get('nivel') ?? '';
  const gratuito = sp.get('gratuito') ?? '';
  const page = Number(sp.get('page') ?? '1');

  const { data, isLoading } = useQuery({
    queryKey: ['catalogo-cursos', area, nivel, gratuito, page],
    queryFn: () => catalogoApi.getCursos({
      ...(area ? { area } : {}),
      ...(nivel ? { nivel } : {}),
      ...(gratuito === 'true' ? { gratuito: true as const } : {}),
      page, pageSize: 12,
    }),
  });

  const cursos = data?.data ?? [];
  const pageCount = data?.meta.pageCount ?? 1;

  const set = (k: string, v: string) => {
    const next = new URLSearchParams(sp);
    if (v) next.set(k, v); else next.delete(k);
    if (k !== 'page') next.delete('page');
    setSp(next, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background px-4 py-16 sm:px-6">
      <SEOHead title="Cursos" description="Explora cursos com certificado de instituições parceiras angolanas." url="https://usepdc.com/cursos" />
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">Cursos</h1>
        <p className="mt-2 text-text-muted">Explora cursos com certificado de instituições parceiras.</p>

        <div className="mt-6 flex flex-wrap gap-2">
          {AREAS.map((a) => (
            <button key={a} onClick={() => { set('area', area === a ? '' : a); }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${area === a ? 'bg-amber text-black' : 'bg-surface-raised text-text-secondary hover:text-text-primary'}`}
            >{a}</button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {NIVEIS.map((n) => (
            <button key={n} onClick={() => { set('nivel', nivel === n ? '' : n); }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${nivel === n ? 'bg-info text-white' : 'bg-surface-raised text-text-secondary hover:text-text-primary'}`}
            >{n}</button>
          ))}
          <button onClick={() => { set('gratuito', gratuito === 'true' ? '' : 'true'); }}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${gratuito === 'true' ? 'bg-success text-white' : 'bg-surface-raised text-text-secondary hover:text-text-primary'}`}
          >Gratuito</button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : cursos.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-text-muted">Nenhum curso encontrado.</p>
            <Link to="/criar-conta" className="mt-4 inline-block text-sm text-amber hover:underline">Criar conta gratuita</Link>
          </div>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {cursos.map((c) => <CursoCard key={c.id} curso={c} />)}
            </div>
            {pageCount > 1 && <Pagination page={page} pageCount={pageCount} onPageChange={(p) => { set('page', String(p)); }} className="mt-10" />}
          </>
        )}
      </div>
    </div>
  );
}

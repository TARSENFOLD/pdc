import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { catalogoApi } from '@/lib/api/catalogo';
import { Spinner, Card, Pagination, Avatar } from '@/components/ui';
import type { MentorPublico } from '@pdc/shared';

const AREAS = ['Tecnologia', 'Saúde', 'Engenharia', 'Direito', 'Gestão', 'Educação', 'Artes'];

function MentorCard({ mentor }: { mentor: MentorPublico }) {
  return (
    <Link to={`/mentores/${mentor.id}`}>
      <Card interactive className="flex items-start gap-4 p-5">
        <Avatar size="lg" {...(mentor.avatarUrl ? { src: mentor.avatarUrl } : {})} alt={mentor.nome} fallback={mentor.nome.substring(0, 2)} />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-text-primary line-clamp-1">{mentor.nome}</h3>
          {mentor.areaEspecialidade ? <p className="text-xs text-amber">{mentor.areaEspecialidade}</p> : null}
          {mentor.bio ? <p className="mt-1 text-xs text-text-muted line-clamp-2">{mentor.bio}</p> : null}
          <span className="mt-2 inline-block text-xs font-medium text-amber">Conectar →</span>
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
      page, pageSize: 12,
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
    <div className="min-h-screen bg-background px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">Mentores</h1>
        <p className="mt-2 text-text-muted">Conecta-te com profissionais da indústria angolana.</p>

        <div className="mt-6 flex flex-wrap gap-2">
          {AREAS.map((a) => (
            <button key={a} onClick={() => { set('area', area === a ? '' : a); }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${area === a ? 'bg-amber text-black' : 'bg-surface-raised text-text-secondary hover:text-text-primary'}`}
            >{a}</button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : mentores.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-text-muted">Nenhum mentor encontrado.</p>
            <Link to="/criar-conta" className="mt-4 inline-block text-sm text-amber hover:underline">Criar conta gratuita</Link>
          </div>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {mentores.map((m) => <MentorCard key={m.id} mentor={m} />)}
            </div>
            {pageCount > 1 && <Pagination page={page} pageCount={pageCount} onPageChange={(p) => { set('page', String(p)); }} className="mt-10" />}
          </>
        )}
      </div>
    </div>
  );
}

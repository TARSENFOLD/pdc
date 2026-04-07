import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { cursosApi } from '@/lib/api/cursos';
import { Spinner, Badge } from '@/components/ui';
import type { InscricaoComCurso } from '@pdc/shared';

export function MeusCursosPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['cursos', 'me', 'inscricoes'],
    queryFn: () => cursosApi.getMinhasInscricoes(),
  });

  const inscricoes = (data?.data ?? []) as unknown as InscricaoComCurso[];

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-text-primary font-sora">Os Meus Cursos</h1>
      {inscricoes.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface-raised p-8 text-center">
          <p className="text-text-secondary">Ainda não estás inscrito em nenhum curso.</p>
          <Link to="/app/cursos" className="mt-4 inline-block text-sm text-amber hover:underline">
            Explorar cursos
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {inscricoes.map((inscricao: InscricaoComCurso) => (
            <Link

              key={inscricao.id}
              to={`/app/cursos/${inscricao.cursoId}`}
              className="flex items-center justify-between rounded-xl border border-border bg-surface-raised p-4 transition-colors hover:border-amber/20"
            >
              <div>
                <p className="text-sm font-medium text-text-primary">{inscricao.curso?.titulo ?? 'Curso'}</p>
                <p className="mt-0.5 text-xs text-text-muted">
                  Inscrito em {new Date(inscricao.dataInscricao).toLocaleDateString('pt-AO')}
                </p>
              </div>
              <Badge variant={inscricao.concluido ? 'success' : 'outline'}>
                {inscricao.concluido ? 'Concluído' : `${String(inscricao.progressoPercentagem)}%`}
              </Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

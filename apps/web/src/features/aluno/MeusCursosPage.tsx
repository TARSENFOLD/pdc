import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { http } from '@/lib/api/http';
import { Spinner, Badge } from '@/components/ui';

interface InscricaoComCurso {
  id: string;
  cursoId: string;
  alunoId: string;
  dataInscricao: string;
  concluido: boolean;
  progressoPercentagem: number;
  curso?: { titulo?: string };
}

export function MeusCursosPage() {
  const { data, isLoading } = useQuery<{ data: InscricaoComCurso[] }>({
    queryKey: ['cursos', 'me', 'inscricoes'],
    queryFn: () => http.get<{ data: InscricaoComCurso[] }>('/cursos/me/inscricoes'),
  });

  const inscricoes = data?.data ?? [];

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">Os Meus Cursos</h1>
      {inscricoes.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-white/3 p-8 text-center">
          <p className="text-white/50">Ainda não estás inscrito em nenhum curso.</p>
          <Link to="/app/cursos" className="mt-4 inline-block text-sm text-amber hover:underline">
            Explorar cursos
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {inscricoes.map((i) => (
            <Link
              key={i.id}
              to={`/app/cursos/${i.cursoId}`}
              className="flex items-center justify-between rounded-xl border border-white/5 bg-white/3 p-4 transition-colors hover:border-amber/20"
            >
              <div>
                <p className="text-sm font-medium text-white">{i.curso?.titulo ?? 'Curso'}</p>
                <p className="mt-0.5 text-xs text-white/40">
                  Inscrito em {new Date(i.dataInscricao).toLocaleDateString('pt-AO')}
                </p>
              </div>
              <Badge variant={i.concluido ? 'success' : 'outline'}>
                {i.concluido ? 'Concluído' : `${String(i.progressoPercentagem)}%`}
              </Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

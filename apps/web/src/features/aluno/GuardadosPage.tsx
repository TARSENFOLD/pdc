import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { bookmarkApi } from '@/lib/api/interactions';
import { Spinner, Badge } from '@/components/ui';
import type { Bookmark } from '@pdc/shared';

const TIPO_LABEL: Record<string, string> = {
  curso: 'Curso', simulacao: 'Simulação', experiencia: 'Experiência', projeto: 'Projecto',
};
const TIPO_HREF: Record<string, string> = {
  curso: '/app/cursos', simulacao: '/app/simulacoes', experiencia: '/experiencias', projeto: '/projetos',
};

export function GuardadosPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['bookmarks'],
    queryFn: () => bookmarkApi.list(),
  });

  const bookmarks: Bookmark[] = data?.data ?? [];

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-text-primary">Guardados</h1>
      {bookmarks.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface-raised p-8 text-center">
          <p className="text-text-secondary">Ainda não guardaste nenhum conteúdo.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookmarks.map((b) => (
            <Link
              key={b.id}
              to={`${TIPO_HREF[b.targetType] ?? '/app'}/${b.targetId}`}
              className="flex items-center justify-between rounded-xl border border-border bg-surface-raised p-4 transition-colors hover:border-amber/20"
            >
              <p className="text-sm font-medium text-text-primary">{b.targetId}</p>
              <Badge variant="outline">{TIPO_LABEL[b.targetType] ?? b.targetType}</Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button, Card, Badge, CardGridSkeleton } from '@/components/ui';
import { cursosApi } from '@/lib/api/cursos';
import { Plus, Edit2, Eye } from 'lucide-react';

export function MentorCursosPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['cursos', 'meus'],
    queryFn: () => cursosApi.getMeus(),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text-primary font-sora">Os Meus Cursos</h1>
        </div>
        <CardGridSkeleton />
      </div>
    );
  }

  const cursos = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary font-sora">Os Meus Cursos</h1>
        <Button asChild>
          <Link to="/app/mentor/cursos/criar">
            <Plus className="mr-2 h-4 w-4" />
            Criar Curso
          </Link>
        </Button>
      </div>

      {cursos.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-text-muted mb-4">Ainda não criaste nenhum curso.</p>
          <Button asChild variant="secondary">
            <Link to="/app/mentor/cursos/criar">Começar agora</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cursos.map((curso) => (
            <Card key={curso.id} className="overflow-hidden flex flex-col h-full border-border/40 hover:border-amber/40 transition-colors">
              {curso.capaUrl ? (
                <img src={curso.capaUrl} alt={curso.titulo} className="h-40 w-full object-cover" />
              ) : (
                <div className="h-40 w-full bg-surface-hover flex items-center justify-center">
                  <span className="text-text-muted">Sem capa</span>
                </div>
              )}
              <div className="p-4 flex flex-col flex-1">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant={curso.estado === 'published' ? 'success' : 'warning'}>
                    {curso.estado === 'published' ? 'Publicado' : 'Rascunho'}
                  </Badge>
                  <span className="text-xs text-text-muted">{curso.inscritosCount ?? 0} inscritos</span>
                </div>
                <h3 className="font-bold text-lg text-text-primary mb-2 line-clamp-2">{curso.titulo}</h3>
                <p className="text-sm text-text-muted line-clamp-3 mb-4 flex-1">{curso.descricao}</p>
                <div className="flex gap-2">
                  <Button asChild variant="secondary" size="sm" className="flex-1">
                    <Link to={`/app/mentor/cursos/${curso.id}/editar`}>
                      <Edit2 className="mr-2 h-3 w-3" />
                      Editar
                    </Link>
                  </Button>
                  <Button asChild variant="secondary" size="sm" className="flex-1">
                    <Link to={`/cursos/${curso.id}`}>
                      <Eye className="mr-2 h-3 w-3" />
                      Ver
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

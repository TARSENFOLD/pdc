import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button, Card, CardGridSkeleton } from '@/components/ui';
import { EditorialStateBadge } from '@/components/ui/EditorialStateBadge';
import { cursosApi } from '@/lib/api/cursos';
import { toast } from '@/hooks/useToast';
import { Plus, Edit2, Eye, Send, Globe } from 'lucide-react';

export function MentorCursosPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['cursos', 'meus'],
    queryFn: () => cursosApi.getMeus(),
  });

  const estadoMutation = useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: 'draft' | 'review' | 'published' | 'archived' }) =>
      cursosApi.updateEstado(id, estado),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['cursos', 'meus'] });
      toast({ title: 'Estado atualizado.' });
    },
    onError: () => { toast({ title: 'Falha na transição de estado', variant: 'error' }); },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-ink-primary font-sora">Os Meus Cursos</h1>
        </div>
        <CardGridSkeleton />
      </div>
    );
  }

  const cursos = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink-primary font-sora">Os Meus Cursos</h1>
        <Button asChild>
          <Link to="/app/mentor/cursos/criar">
            <Plus className="mr-2 h-4 w-4" />
            Criar Curso
          </Link>
        </Button>
      </div>

      {cursos.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-ink-tertiary mb-4">Ainda não criaste nenhum curso.</p>
          <Button asChild variant="secondary">
            <Link to="/app/mentor/cursos/criar">Começar agora</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cursos.map((curso) => (
            <Card key={curso.id} className="overflow-hidden flex flex-col h-full border-ink-tertiary/10 hover:border-accent/40 transition-colors">
              {curso.capaUrl ? (
                <img src={curso.capaUrl} alt={curso.titulo} className="h-40 w-full object-cover" />
              ) : (
                <div className="h-40 w-full bg-canvas-hover flex items-center justify-center">
                  <span className="text-ink-tertiary">Sem capa</span>
                </div>
              )}
              <div className="p-4 flex flex-col flex-1">
                <div className="flex items-center justify-between mb-2">
                  <EditorialStateBadge state={curso.estado} />
                  <span className="text-xs text-ink-tertiary">{curso.inscritosCount ?? 0} inscritos</span>
                </div>
                <h3 className="font-bold text-lg text-ink-primary mb-2 line-clamp-2">{curso.titulo}</h3>
                <p className="text-sm text-ink-tertiary line-clamp-3 mb-4 flex-1">{curso.descricao}</p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="secondary" size="sm" className="flex-1">
                    <Link to={`/app/mentor/cursos/${curso.id}/editar`}>
                      <Edit2 className="mr-2 h-3 w-3" />
                      Editar
                    </Link>
                  </Button>
                  <Button asChild variant="secondary" size="sm" className="flex-1">
                    <Link to={`/app/cursos/${curso.id}`}>
                      <Eye className="mr-2 h-3 w-3" />
                      Ver
                    </Link>
                  </Button>
                  {curso.estado === 'draft' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => { estadoMutation.mutate({ id: curso.id, estado: 'review' }); }}
                      isLoading={estadoMutation.isPending}
                    >
                      <Send className="mr-2 h-3 w-3" />
                      Submeter
                    </Button>
                  )}
                  {curso.estado === 'approved' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => { estadoMutation.mutate({ id: curso.id, estado: 'published' }); }}
                      isLoading={estadoMutation.isPending}
                    >
                      <Globe className="mr-2 h-3 w-3" />
                      Publicar
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button, Card, CardGridSkeleton, Badge } from '@/components/ui';
import { EditorialStateBadge } from '@/components/ui/EditorialStateBadge';
import { simulacoesApi } from '@/lib/api/simulacoes';
import { Plus, Edit2, Eye } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';

export function MentorSimulacoesPage() {
  const { user } = useAuth();
  const routeBase = user?.role === 'instituicao'
    ? '/app/instituicao/simulacoes'
    : '/app/mentor/simulacoes';
  const { data, isLoading } = useQuery({
    queryKey: ['simulacoes', 'minhas'],
    queryFn: () => simulacoesApi.getMinhas(),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-ink-primary font-sora">As Minhas Simulações</h1>
        </div>
        <CardGridSkeleton />
      </div>
    );
  }

  const simulacoes = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink-primary font-sora">As Minhas Simulações</h1>
        <Button asChild>
          <Link to={`${routeBase}/criar`}>
            <Plus className="mr-2 h-4 w-4" />
            Criar Simulação
          </Link>
        </Button>
      </div>

      {simulacoes.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-ink-tertiary mb-4">Ainda não criaste nenhuma simulação.</p>
          <Button asChild variant="secondary">
            <Link to={`${routeBase}/criar`}>Começar agora</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {simulacoes.map((sim) => (
            <Card key={sim.id} className="overflow-hidden flex flex-col h-full border-ink-tertiary/10/40 hover:border-accent/40 transition-colors">
              {sim.capaUrl ? (
                <img src={sim.capaUrl} alt={sim.titulo} className="h-40 w-full object-cover" />
              ) : (
                <div className="h-40 w-full bg-canvas-hover flex items-center justify-center">
                  <span className="text-ink-tertiary">Sem capa</span>
                </div>
              )}
              <div className="p-4 flex flex-col flex-1">
                <div className="flex items-center justify-between mb-2">
                  <EditorialStateBadge state={sim.estado} />
                  <Badge variant="outline" className="normal-case text-[10px]">Tipo {sim.tipo}</Badge>
                </div>
                <h3 className="font-bold text-lg text-ink-primary mb-2 line-clamp-2">{sim.titulo}</h3>
                <p className="text-sm text-ink-tertiary line-clamp-3 mb-4 flex-1">{sim.descricao}</p>
                <div className="flex gap-2">
                  <Button asChild variant="secondary" size="sm" className="flex-1">
                    <Link to={`${routeBase}/${sim.id}/editar`}>
                      <Edit2 className="mr-2 h-3 w-3" />
                      Editar
                    </Link>
                  </Button>
                  <Button asChild variant="secondary" size="sm" className="flex-1">
                    <Link to={`/app/simulacoes/${sim.id}`}>
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

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { denunciasApi } from '@/lib/api/denuncias';
import { Card, Badge, Spinner } from '@/components/ui';

export function ModeradorDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['denuncias', 'pendentes'],
    queryFn: () => denunciasApi.list({ estado: 'pendente', pageSize: 5 }),
  });

  const denuncias = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Painel de Moderação</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-text-primary">Denúncias Pendentes</h2>
            <Link to="/app/moderacao/denuncias" className="text-sm text-amber hover:underline">
              Ver todas
            </Link>
          </div>

          {denuncias.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-muted">Nenhuma denúncia pendente.</p>
          ) : (
            <div className="space-y-4">
              {denuncias.map((d) => (
                <Link
                  key={d.id}
                  to={`/app/moderacao/denuncias/${d.id}`}
                  className="block rounded-lg border border-border bg-background p-4 transition-colors hover:border-amber/50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs text-text-muted mb-1">{d.conteudoTipo} • {new Date(d.criadaEm).toLocaleDateString()}</p>
                      <p className="text-sm text-text-primary line-clamp-1">{d.motivo}</p>
                    </div>
                    <Badge variant="warning">Pendente</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold text-text-primary mb-4">Métricas Rápidas</h2>
          <div className="space-y-4">
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-sm text-text-secondary">Pendentes</span>
              <span className="font-bold text-error">{data?.pagination?.total ?? 0}</span>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-sm text-text-secondary">Resolvidas (hoje)</span>
              <span className="font-bold text-success">0</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

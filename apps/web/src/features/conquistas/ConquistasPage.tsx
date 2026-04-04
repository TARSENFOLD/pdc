import { useQuery } from '@tanstack/react-query';
import { conquistasApi } from '@/lib/api/conquistas';
import { Spinner, Card } from '@/components/ui';
import type { Conquista } from '@pdc/shared';
import { cn } from '@/lib/utils';

function ConquistaCard({ conquista }: { conquista: Conquista }) {
  return (
    <Card
      className={cn(
        'flex flex-col items-center gap-3 p-6 text-center transition-opacity',
        !conquista.desbloqueada && 'opacity-40 grayscale'
      )}
    >
      <span className="text-4xl" role="img" aria-label={conquista.titulo}>
        {conquista.icone}
      </span>
      <div>
        <h3 className="font-semibold text-text-primary">{conquista.titulo}</h3>
        <p className="mt-1 text-xs text-text-muted">{conquista.descricao}</p>
        {conquista.desbloqueada && conquista.dataDesbloqueio ? (
          <p className="mt-2 text-xs text-success">
            Desbloqueada em{' '}
            {new Date(conquista.dataDesbloqueio).toLocaleDateString('pt-PT', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        ) : (
          <p className="mt-2 text-xs text-text-muted">Bloqueada</p>
        )}
      </div>
    </Card>
  );
}

export function ConquistasPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['conquistas', 'minhas'],
    queryFn: conquistasApi.minhas,
  });

  const conquistas = data?.data ?? [];
  const desbloqueadas = conquistas.filter((c) => c.desbloqueada).length;

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Conquistas</h1>
          {!isLoading && (
            <p className="mt-1 text-sm text-text-muted">
              {desbloqueadas} de {conquistas.length} desbloqueadas
            </p>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : isError ? (
        <p className="py-12 text-center text-text-muted">Erro ao carregar conquistas.</p>
      ) : conquistas.length === 0 ? (
        <p className="py-12 text-center text-text-muted">Nenhuma conquista encontrada.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {conquistas.map((c) => (
            <ConquistaCard key={c.id} conquista={c} />
          ))}
        </div>
      )}
    </div>
  );
}

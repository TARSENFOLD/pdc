import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { comiteApi } from '@/lib/api/comite';
import { Spinner, Card } from '@/components/ui';

export function ComiteDashboard() {
  const { data: simulacoes, isLoading: loadingSim } = useQuery({
    queryKey: ['comite', 'fila', 'simulacao'],
    queryFn: () => comiteApi.getFila('simulacao'),
  });
  const { data: experiencias, isLoading: loadingExp } = useQuery({
    queryKey: ['comite', 'fila', 'experiencia'],
    queryFn: () => comiteApi.getFila('experiencia'),
  });

  const totalPendente = (simulacoes?.pagination.total ?? 0) + (experiencias?.pagination.total ?? 0);
  const isLoading = loadingSim || loadingExp;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white font-display">Comité Científico</h1>
      <p className="text-white/50 text-sm">Valida o rigor académico das simulações e experiências antes da publicação.</p>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          <Card className="p-6">
            <p className="text-sm font-medium text-text-secondary">Simulações Pendentes</p>
            <p className="mt-2 text-3xl font-bold text-amber">{simulacoes?.pagination.total ?? 0}</p>
            <Link to="/app/comite/validacao" className="mt-4 inline-block text-xs text-amber hover:underline">
              Validar simulações →
            </Link>
          </Card>
          <Card className="p-6">
            <p className="text-sm font-medium text-text-secondary">Experiências Pendentes</p>
            <p className="mt-2 text-3xl font-bold text-amber">{experiencias?.pagination.total ?? 0}</p>
            <Link to="/app/comite/validacao" className="mt-4 inline-block text-xs text-amber hover:underline">
              Validar experiências →
            </Link>
          </Card>
        </div>
      )}

      {totalPendente === 0 && !isLoading && (
        <div className="rounded-2xl border border-white/5 bg-white/3 p-8 text-center">
          <p className="text-4xl mb-4">✅</p>
          <p className="text-white/50">Nenhum conteúdo aguarda validação científica.</p>
        </div>
      )}
    </div>
  );
}

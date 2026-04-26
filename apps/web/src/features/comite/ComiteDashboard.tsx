import { useQuery } from '@tanstack/react-query';
import { CheckCircle } from 'lucide-react';
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
      <h1 className="text-2xl font-bold text-ink-primary font-display">Comité Científico</h1>
      <p className="text-ink-secondary text-sm">Valida o rigor académico das simulações e experiências antes da publicação.</p>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          <Card className="p-6">
            <p className="text-sm font-medium text-ink-secondary">Simulações Pendentes</p>
            <p className="mt-2 text-3xl font-bold text-accent">{simulacoes?.pagination.total ?? 0}</p>
            <Link to="/app/comite/validacao" className="mt-4 inline-block text-xs text-accent hover:underline">
              Validar simulações →
            </Link>
          </Card>
          <Card className="p-6">
            <p className="text-sm font-medium text-ink-secondary">Experiências Pendentes</p>
            <p className="mt-2 text-3xl font-bold text-accent">{experiencias?.pagination.total ?? 0}</p>
            <Link to="/app/comite/validacao" className="mt-4 inline-block text-xs text-accent hover:underline">
              Validar experiências →
            </Link>
          </Card>
        </div>
      )}

      {totalPendente === 0 && !isLoading && (
        <div className="rounded-2xl border border-ink-tertiary/10 bg-elevated p-8 text-center">
          <CheckCircle size={40} aria-hidden={true} className="mb-4 text-emerald-500 mx-auto" />
          <p className="text-ink-secondary">Nenhum conteúdo aguarda validação científica.</p>
        </div>
      )}
    </div>
  );
}

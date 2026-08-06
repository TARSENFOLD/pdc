import { useQuery } from '@tanstack/react-query';
import { experienciasApi } from '@/lib/api/experiencias';
import { Card, Spinner, Badge, EmptyState } from '@/components/ui';
import { BarChart3 } from 'lucide-react';

export function RelatoriosInstituicaoPage() {
  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['experiencias', 'stats'],
    queryFn: () => experienciasApi.getStats(),
  });

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>;

  if (isError || !stats) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-6">
        <EmptyState
          icon={BarChart3}
          variant="error"
          title="Não foi possível carregar os relatórios"
          description="Tenta novamente mais tarde."
        />
      </div>
    );
  }

  const totals = [
    { label: 'Conteúdos', value: stats.conteudosTotais },
    { label: 'Inscrições', value: stats.inscricoesTotais },
    { label: 'Participações', value: stats.participacoesTotais },
  ] as const;

  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-20">
      <header>
        <div>
          <Badge variant="info" className="mb-3 border-accent/20 bg-accent/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-accent">
            Relatório institucional
          </Badge>
          <h1 className="font-display text-4xl font-black tracking-tighter text-ink-primary">
            Contagens disponíveis
          </h1>
          <p className="mt-2 text-sm text-ink-secondary">
            Apenas dados reais actualmente disponíveis.
          </p>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {totals.map(({ label, value }) => (
          <Card key={label} className="p-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-ink-tertiary">{label}</p>
            <p className="mt-3 font-mono text-4xl font-black text-ink-primary">
              {value === null ? 'Sem dados suficientes' : value}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}

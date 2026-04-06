import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { AlertTriangle } from 'lucide-react';
import { adminApi } from '@/lib/api/admin';
import { Spinner, Card } from '@/components/ui';

interface RelatorioRetencao {
  totalAlunos: number;
  alunosAtivos: number;
  taxaRetencao: number;
  semDados: boolean;
  totalEventos: number;
}

export function AdminRelatoriosPage() {
  const { data, isLoading } = useQuery<RelatorioRetencao>({
    queryKey: ['admin', 'relatorios', 'retencao'],
    queryFn: () => adminApi.getRelatoriosRetencao(),
  });

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Relatórios</h1>
      {data?.semDados ? (
        <div className="rounded-2xl border border-amber/20 bg-amber/5 p-6">
          <p className="text-amber text-sm font-medium"><AlertTriangle size={16} aria-hidden={true} className="inline-block mr-1 align-text-bottom" /> Ainda não há dados suficientes para gerar relatórios.</p>
          <p className="text-white/40 text-xs mt-1">Os relatórios serão gerados automaticamente à medida que os utilizadores interagem com a plataforma.</p>
        </div>
      ) : null}
      <div className="grid gap-6 sm:grid-cols-3">
        <Card className="p-6">
          <p className="text-sm font-medium text-text-secondary">Total Alunos</p>
          <p className="mt-2 text-3xl font-bold text-amber">{data?.totalAlunos ?? 0}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm font-medium text-text-secondary">Alunos Ativos</p>
          <p className="mt-2 text-3xl font-bold text-amber">{data?.alunosAtivos ?? 0}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm font-medium text-text-secondary">Taxa de Retenção</p>
          <p className="mt-2 text-3xl font-bold text-amber">{data?.taxaRetencao ?? 0}%</p>
        </Card>
      </div>
    </div>
  );
}

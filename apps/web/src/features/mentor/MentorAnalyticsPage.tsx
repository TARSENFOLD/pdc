import { useQuery } from '@tanstack/react-query';
import { mentoriasApi } from '@/lib/api/mentorias';
import { Card, Spinner } from '@/components/ui';
import { Users, BookOpen, Clock } from 'lucide-react';

export function MentorAnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['mentor', 'stats'],
    queryFn: () => mentoriasApi.getStats(),
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const stats = [
    {
      label: 'Mentorias Activas',
      value: data?.mentoriasActivas || 0,
      icon: Clock,
      color: 'text-amber',
      bg: 'bg-amber/10',
    },
    {
      label: 'Alunos Orientados',
      value: data?.alunosOrientados || 0,
      icon: Users,
      color: 'text-info',
      bg: 'bg-info/10',
    },
    {
      label: 'Avaliações Pendentes',
      value: data?.avaliacoesPendentes || 0,
      icon: BookOpen,
      color: 'text-success',
      bg: 'bg-success/10',
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-sora text-text-primary">Métricas de Mentor</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-6 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
              <stat.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-muted">{stat.label}</p>
              <p className="text-3xl font-bold text-text-primary mt-1">{stat.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-8 border-dashed border-2 border-border/40 bg-surface/30 flex flex-col items-center justify-center text-center">
        <p className="text-text-muted">Mais métricas detalhadas (progresso médio, taxa de sucesso, etc.) estarão disponíveis em breve.</p>
      </Card>
    </div>
  );
}

import { useAuth } from '@/lib/auth/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { perfisApi } from '@/lib/api/perfis';
import { Spinner } from '@/components/ui';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  description?: string;
}

function StatCard({ label, value, icon, description }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/3 p-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-white/40">
          {label}
        </span>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      {description && (
        <p className="mt-1 text-xs text-white/40">{description}</p>
      )}
    </div>
  );
}

export function AlunoDashboard() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['perfil', 'me', 'stats'],
    queryFn: () => perfisApi.getMyStats(),
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Olá, {user?.nome ?? 'Aluno'}</h1>
        <p className="mt-1 text-sm text-white/50">Aqui está o resumo da tua actividade</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Simulações concluídas"
          value={stats?.simulacoesConcluidas ?? '—'}
          icon="🧪"
          description="Completa simulações para construir o teu perfil"
        />
        <StatCard
          label="Perfil Vocacional"
          value="—"
          icon="📊"
          description="Completa pelo menos uma simulação"
        />
        <StatCard
          label="Cursos em progresso"
          value={stats?.cursosEmProgresso ?? '—'}
          icon="📚"
          description="Explora o catálogo de cursos"
        />
      </div>

      <div className="mt-8 rounded-2xl border border-amber/20 bg-amber/5 p-6">
        <h2 className="mb-2 font-semibold text-amber">Próximo passo</h2>
        <p className="text-sm text-white/60">
          Começa a tua primeira simulação para construir o teu Perfil Vocacional.
          O sistema aprende com o teu comportamento real.
        </p>
      </div>
    </div>
  );
}

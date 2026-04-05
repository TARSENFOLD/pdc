import { useAuth } from '@/lib/auth/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { experienciasApi } from '@/lib/api/experiencias';
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

export function InstituicaoDashboard() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['experiencias', 'stats'],
    queryFn: () => experienciasApi.getStats(),
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
        <h1 className="text-2xl font-bold text-white">{user?.nome ?? 'Instituição'}</h1>
        <p className="mt-1 text-sm text-white/50">Painel da instituição</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Experiências publicadas"
          value={stats?.experienciasPublicadas ?? '—'}
          icon="🏛️"
          description="Experiências visíveis na plataforma"
        />
        <StatCard
          label="Inscrições totais"
          value={stats?.inscricoesTotais ?? '—'}
          icon="📋"
          description="Estudantes inscritos nos vossos programas"
        />
        <StatCard
          label="Programas activos"
          value={stats?.programasActivos ?? '—'}
          icon="📌"
          description="Programas em curso"
        />
      </div>

      <div className="mt-8 rounded-2xl border border-white/5 bg-white/3 p-6">
        <h2 className="mb-2 font-semibold text-white">Acções rápidas</h2>
        <p className="text-sm text-white/40">
          Publica uma experiência ou cria um programa para começar a atrair estudantes.
        </p>
      </div>
    </div>
  );
}

import { useAuth } from '@/lib/auth/AuthContext';

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

export function MentorDashboard() {
  const { user } = useAuth();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Olá, {user?.nome ?? 'Mentor'}</h1>
        <p className="mt-1 text-sm text-white/50">Painel de mentorias</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Mentorias activas"
          value={0}
          icon="👨‍🏫"
          description="Conexões de mentoria em curso"
        />
        <StatCard
          label="Alunos orientados"
          value={0}
          icon="🎓"
          description="Total de alunos que já orientaste"
        />
        <StatCard
          label="Avaliações pendentes"
          value={0}
          icon="📝"
          description="Submissões à espera de feedback"
        />
      </div>

      <div className="mt-8 rounded-2xl border border-white/5 bg-white/3 p-6">
        <h2 className="mb-2 font-semibold text-white">Actividade recente</h2>
        <p className="text-sm text-white/40">Sem actividade recente. Aceita pedidos de mentoria para começar.</p>
      </div>
    </div>
  );
}

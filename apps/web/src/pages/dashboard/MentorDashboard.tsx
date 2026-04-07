import { useAuth } from '@/lib/auth/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { mentoriasApi } from '@/lib/api/mentorias';
import { Spinner } from '@/components/ui';
import { Users, GraduationCap, ClipboardList } from 'lucide-react';
import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ComponentType<LucideProps>;
  description?: string;
}

function StatCard({ label, value, icon: Icon, description }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-surface-raised p-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          {label}
        </span>
        <Icon size={20} aria-hidden={true} className="text-amber" />
      </div>
      <p className="text-3xl font-bold text-text-primary">{value}</p>
      {description && (
        <p className="mt-1 text-xs text-text-muted">{description}</p>
      )}
    </div>
  );
}

export function MentorDashboard() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['mentorias', 'stats'],
    queryFn: () => mentoriasApi.getStats(),
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
        <h1 className="text-2xl font-bold text-text-primary">Olá, {user?.nome ?? 'Mentor'}</h1>
        <p className="mt-1 text-sm text-text-secondary">Painel de mentorias</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Mentorias activas"
          value={stats?.mentoriasActivas ?? '—'}
          icon={Users}
          description="Conexões de mentoria em curso"
        />
        <StatCard
          label="Alunos orientados"
          value={stats?.alunosOrientados ?? '—'}
          icon={GraduationCap}
          description="Total de alunos que já orientaste"
        />
        <StatCard
          label="Avaliações pendentes"
          value={stats?.avaliacoesPendentes ?? '—'}
          icon={ClipboardList}
          description="Submissões à espera de feedback"
        />
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-surface-raised p-6">
        <h2 className="mb-2 font-semibold text-text-primary">Actividade recente</h2>
        <p className="text-sm text-text-muted">Sem actividade recente. Aceita pedidos de mentoria para começar.</p>
      </div>
    </div>
  );
}

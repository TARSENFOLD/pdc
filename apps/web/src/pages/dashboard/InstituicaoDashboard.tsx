import { useAuth } from '@/lib/auth/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { experienciasApi } from '@/lib/api/experiencias';
import { Spinner } from '@/components/ui';
import { Building2, ClipboardList, MapPin } from 'lucide-react';
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
        <h1 className="text-2xl font-bold text-text-primary">{user?.nome ?? 'Instituição'}</h1>
        <p className="mt-1 text-sm text-text-secondary">Painel da instituição</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Experiências publicadas"
          value={stats?.experienciasPublicadas ?? '—'}
          icon={Building2}
          description="Experiências visíveis na plataforma"
        />
        <StatCard
          label="Inscrições totais"
          value={stats?.inscricoesTotais ?? '—'}
          icon={ClipboardList}
          description="Estudantes inscritos nos vossos programas"
        />
        <StatCard
          label="Programas activos"
          value={stats?.programasActivos ?? '—'}
          icon={MapPin}
          description="Programas em curso"
        />
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-surface-raised p-6">
        <h2 className="mb-2 font-semibold text-text-primary">Acções rápidas</h2>
        <p className="text-sm text-text-muted">
          Publica uma experiência ou cria um programa para começar a atrair estudantes.
        </p>
      </div>
    </div>
  );
}

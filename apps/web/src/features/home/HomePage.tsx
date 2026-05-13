import { useAuth } from '@/lib/auth/auth-context';
import { Spinner } from '@/components/ui';
import { useQuery } from '@tanstack/react-query';
import type { HomeSummary, Role } from '@pdc/shared';
import { http } from '@/lib/api/http';
import { HomeHero } from './HomeHero';
import { HomeMainColumn } from './HomeMainColumn';
import { HomeSidebarWidgets } from './HomeSidebarWidgets';

export default function HomePage(): React.ReactNode {
  const { user, isLoading } = useAuth();
  const homeQuery = useQuery({
    queryKey: ['home-summary'],
    queryFn: () => http.get<HomeSummary>('/app/home'),
    enabled: !isLoading,
    staleTime: 60_000,
  });

  if (isLoading || homeQuery.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const role: Role = user?.role ?? 'estudante';
  const summary = homeQuery.data;

  if (!summary) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-ink-tertiary">Não foi possível carregar o resumo. Tenta novamente.</p>
      </div>
    );
  }

  return (
    <div className="pb-16 animate-in fade-in duration-500 space-y-10">

      {/* ── Hero: full-width (quick actions + greeting + vídeo) ── */}
      <HomeHero summary={summary} role={role} />

      {/* ── Grid: conteúdo + sidebar ── */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_280px] lg:items-start">
        <HomeMainColumn summary={summary} role={role} />
        <div className="hidden lg:block">
          <HomeSidebarWidgets summary={summary} />
        </div>
      </div>

    </div>
  );
}

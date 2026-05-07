import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Loading skeleton for RoleDashboardShell.
 * Does NOT import BentoGrid, BentoTile, or GlassCard.
 */
export function RoleDashboardShellSkeleton() {
  return (
    <div className="p-5 md:p-8 space-y-8 max-w-7xl mx-auto animate-pulse">
      {/* Hero skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-64 md:w-96" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* KPI strip skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-ink-tertiary/10 p-4 space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>

      {/* Primary + side skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
        <div className="rounded-lg border border-ink-tertiary/10 p-6 space-y-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-48 w-full" />
        </div>
        <div className="rounded-lg border border-ink-tertiary/10 p-6 space-y-4">
          <Skeleton className="h-5 w-32" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

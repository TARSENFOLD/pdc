import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-white/5', className)} />;
}

export function FeedCardSkeleton() {
  return (
    <div className="py-5 border-b border-border/40 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-16" />
      </div>
    </div>
  );
}

export function ListRowSkeleton() {
  return (
    <div className="flex items-center justify-between py-4 border-b border-border/40">
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-6 w-20" />
    </div>
  );
}

export function CardGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array(6).fill(0).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-surface p-4 space-y-3">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}

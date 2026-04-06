import { useState, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { feedApi } from '@/lib/api/feed';
import { FeedCard } from './FeedCard';
import { FeedCardSkeleton } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth/AuthContext';
import { Inbox, RefreshCcw } from 'lucide-react';
import type { FeedResponse } from '@pdc/shared';

type FeedTab = 'geral' | 'trending';

export default function FeedPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<FeedTab>(user ? 'geral' : 'trending');
  const { ref, inView } = useInView();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteQuery<FeedResponse>({
    queryKey: ['feed', tab, user?.id],
    queryFn: ({ pageParam }) => {
      const page = pageParam as number;
      return tab === 'geral'
        ? feedApi.getGeral(page)
        : feedApi.getTrending(page);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasMore ? lastPage.meta.page + 1 : undefined,
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const items = data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      <header className="space-y-4">
        <h1 className="text-3xl font-bold text-text-primary tracking-tight">Feed</h1>

        <div className="flex gap-1 bg-surface border border-border rounded-lg p-1">
          {user && (
            <button
              onClick={() => { setTab('geral'); }}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                tab === 'geral'
                  ? 'bg-amber text-black'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Para Ti
            </button>
          )}
          <button
            onClick={() => { setTab('trending'); }}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === 'trending'
                ? 'bg-amber text-black'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Em Alta
          </button>
        </div>
      </header>

      {isLoading && (
        <div className="flex flex-col gap-0">
          {Array.from({ length: 3 }).map((_, i) => <FeedCardSkeleton key={i} />)}
        </div>
      )}

      {isError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 text-center space-y-3">
          <p className="text-red-500 font-medium">Erro ao carregar o feed.</p>
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => { void refetch(); }}>
            <RefreshCcw className="w-4 h-4" /> Tentar novamente
          </Button>
        </div>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <div className="bg-surface border border-border rounded-xl p-12 text-center space-y-3">
          <Inbox className="w-10 h-10 mx-auto text-text-secondary/40" />
          <p className="text-text-secondary">Ainda não há conteúdo disponível.</p>
        </div>
      )}

      {items.length > 0 && (
        <div className="flex flex-col gap-6">
          {items.map((item) => (
            <FeedCard key={`${item.tipo}-${item.id}`} item={item} />
          ))}
        </div>
      )}

      <div ref={ref} className="flex justify-center py-4">
        {isFetchingNextPage && <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber" />}
      </div>

      {hasNextPage && !isFetchingNextPage && (
        <div className="flex justify-center">
          <Button variant="ghost" size="sm" onClick={() => { void fetchNextPage(); }}>
            Carregar mais
          </Button>
        </div>
      )}
    </div>
  );
}

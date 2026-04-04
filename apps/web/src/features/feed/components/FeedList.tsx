import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { useEffect } from 'react';
import { feedApi } from '@/lib/api/feed';
import { FeedItemCard } from './FeedItemCard';
import { Spinner } from '@/components/ui/Spinner';

export function FeedList() {
  const { ref, inView } = useInView();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ['feed', 'general'],
    queryFn: ({ pageParam }) => feedApi.getFeed(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => 
      lastPage.meta.hasMore ? lastPage.meta.page + 1 : undefined,
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 text-center">
        <p className="text-red-500 font-medium">Erro ao carregar o feed. Por favor tenta novamente.</p>
      </div>
    );
  }

  const items = data?.pages.flatMap((page) => page.data) || [];

  if (items.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl p-12 text-center">
        <p className="text-text-secondary">Ainda não há conteúdo disponível no teu feed.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {items.map((item) => (
        <FeedItemCard key={`${item.tipo}-${item.id}`} item={item} />
      ))}

      <div ref={ref} className="flex justify-center py-8">
        {isFetchingNextPage && <Spinner />}
      </div>
    </div>
  );
}

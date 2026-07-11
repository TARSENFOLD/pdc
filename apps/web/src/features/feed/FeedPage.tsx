import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui';
import { FeedCardSkeleton } from '@/components/ui/Skeleton';
import { Search, Zap } from 'lucide-react';
import { http } from '@/lib/api/http';
import { motion } from 'motion/react';
import { APPLE_SPRING } from '@/lib/animations';
import type { FeedResponse, FeedItem } from '@pdc/shared';
import { PostComposerForm } from './PostComposer';
import { ProfileSummaryCard } from './components/ProfileSummaryCard';
import { SuggestedConnections } from './components/SuggestedConnections';
import { VinculosActivity } from './components/VinculosActivity';
import { QuickMessagesWidget } from './components/QuickMessagesWidget';
import { FeedCard } from './components/FeedCard';

export function FeedPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const { data, isLoading } = useQuery<FeedResponse>({
    queryKey: ['feed', 'sovereign'],
    queryFn: () => http.get<FeedResponse>('/feed'),
  });

  const items: FeedItem[] = data?.data ?? [];
  const normalizedQuery = query.trim().toLowerCase();
  const visibleItems = normalizedQuery.length === 0
    ? items
    : items.filter((item) => JSON.stringify(item).toLowerCase().includes(normalizedQuery));

  function updateSearch(value: string): void {
    const next = new URLSearchParams(searchParams);
    const trimmed = value.trim();
    if (trimmed) {
      next.set('q', trimmed);
    } else {
      next.delete('q');
    }
    setSearchParams(next, { replace: true });
  }

  return (
    <div className="animate-in fade-in duration-1000 h-full">
      
      {/* 3-Column Grid Layout — sides fixed, center scrolls */}
      <div className="grid grid-cols-1 lg:grid-cols-[210px_minmax(0,1fr)_240px] gap-3 lg:gap-4 h-full">
        
        {/* LEFT COLUMN — fixed */}
        <div className="hidden lg:flex flex-col gap-4 overflow-hidden">
          <ProfileSummaryCard />
          <SuggestedConnections />
        </div>

        {/* CENTER COLUMN — scrollable feed */}
        <div className="flex flex-col gap-4 overflow-y-auto min-h-0">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-tertiary)]" size={16} />
            <input
              type="search"
              value={query}
              onChange={(event) => { updateSearch(event.target.value); }}
              placeholder="Pesquisar no feed"
              className="min-h-[44px] w-full rounded-xl border border-[var(--chrome-border)] bg-[var(--surface-elevated)] pl-10 pr-4 text-sm text-[var(--ink-primary)] outline-none transition focus:border-[var(--chrome-active)] focus:ring-2 focus:ring-[var(--chrome-active-soft)]"
            />
          </label>
          <PostComposerForm variant="inline" />

          <div data-testid="feed" role="feed" className="flex flex-col gap-4">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--ink-tertiary)]">
              {normalizedQuery ? 'Resultados da pesquisa' : 'Publicações'}
            </p>

            {isLoading ? (
              <>
                <FeedCardSkeleton />
                <FeedCardSkeleton />
                <FeedCardSkeleton />
              </>
            ) : visibleItems.length === 0 ? (
              <Card data-testid="feed-empty" className="p-20 text-center bg-[var(--chrome-surface)] border-[var(--chrome-border)] rounded-sm">
                <Zap size={48} className="mx-auto text-[var(--ink-tertiary)] mb-4 opacity-20" />
                <p className="text-sm text-[var(--ink-tertiary)] font-semibold">
                  {normalizedQuery ? 'Sem resultados para a pesquisa.' : t('feed.emptyState', 'Ainda não há publicações.')}
                </p>
              </Card>
            ) : (
              visibleItems.map((item: FeedItem, idx: number) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...APPLE_SPRING, delay: idx * 0.05 }}
                >
                  <FeedCard item={item} />
                </motion.div>
              ))
            )}
          </div>

          <footer className="pt-6 pb-12 flex justify-center opacity-30 group hover:opacity-100 transition-opacity">
             <p className="text-[10px] font-bold text-[var(--ink-tertiary)] uppercase tracking-[0.3em] flex items-center gap-2">
               <Zap size={14} className="text-[var(--accent-terracotta)]" />
               {t('feed.endOfFeed', 'Não há mais publicações.')}
             </p>
          </footer>
        </div>

        {/* RIGHT COLUMN — fixed */}
        <div className="hidden lg:flex flex-col gap-4 overflow-hidden">
          <VinculosActivity />
          <QuickMessagesWidget />
        </div>

      </div>
    </div>
  );
}

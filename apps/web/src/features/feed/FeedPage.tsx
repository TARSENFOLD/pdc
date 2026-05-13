import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui';
import { FeedCardSkeleton } from '@/components/ui/Skeleton';
import { Zap } from 'lucide-react';
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
  const { data, isLoading } = useQuery<FeedResponse>({
    queryKey: ['feed', 'sovereign'],
    queryFn: () => http.get<FeedResponse>('/feed'),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 pb-20">
        <FeedCardSkeleton />
        <FeedCardSkeleton />
        <FeedCardSkeleton />
      </div>
    );
  }

  const items: FeedItem[] = data?.data ?? [];

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
          <PostComposerForm variant="inline" />

          <div className="flex flex-col gap-4">
            {items.length === 0 ? (
              <Card className="p-20 text-center bg-[var(--chrome-surface)] border-[var(--chrome-border)] rounded-sm">
                <Zap size={48} className="mx-auto text-[var(--ink-tertiary)] mb-4 opacity-20" />
                <p className="text-sm text-[var(--ink-tertiary)] uppercase font-black tracking-widest">{t('feed.emptyState', 'O pulso social está silencioso...')}</p>
              </Card>
            ) : (
              items.map((item: FeedItem, idx: number) => (
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
               {t('feed.endOfFeed', 'Fim do fluxo. Actualizado agora.')}
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

import { useQuery } from '@tanstack/react-query';
import { Card, Avatar, Badge } from '@/components/ui';
import { FeedCardSkeleton } from '@/components/ui/Skeleton';
import { Heart, MessageSquare, Share2, Award, Zap, Clock, Bookmark, MoreHorizontal } from 'lucide-react';
import { http } from '@/lib/api/http';
import { motion } from 'motion/react';
import { APPLE_SPRING } from '@/lib/animations';
import type { FeedResponse, FeedItem } from '@pdc/shared';
import { PostComposerForm } from './PostComposer';
import { FeedActivitySidebar } from './FeedActivitySidebar';

export function FeedPage() {
  const { data, isLoading } = useQuery<FeedResponse>({
    queryKey: ['feed', 'sovereign'],
    queryFn: () => http.get<FeedResponse>('/feed'),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto pb-20">
        <div className="lg:col-span-8 space-y-6">
          <FeedCardSkeleton />
          <FeedCardSkeleton />
          <FeedCardSkeleton />
        </div>
      </div>
    );
  }

  const items: FeedItem[] = data?.data ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto pb-20 animate-in fade-in duration-1000">
      {/* Left/Main Column - Feed */}
      <div className="lg:col-span-8 space-y-6">
        {/* Composer */}
        <section className="pt-2">
          <PostComposerForm variant="inline" />
        </section>

        {/* Feed Items */}
        <div className="space-y-6">
        {items.length === 0 ? (
          <Card className="p-20 text-center border-dashed border-ink-tertiary/20 bg-elevated/50">
            <Zap size={48} className="mx-auto text-ink-tertiary mb-4 opacity-40" />
            <p className="text-sm text-ink-tertiary uppercase font-black tracking-widest">O pulso social está silencioso...</p>
          </Card>
        ) : (
          items.map((item: FeedItem, idx: number) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...APPLE_SPRING, delay: idx * 0.05 }}
            >
              <Card className="group relative overflow-hidden bg-elevated border border-[var(--card-border)] hover:border-accent/30 transition-all p-0 shadow-lg rounded-2xl">
                 
                 {/* Feed Header */}
                  <div className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <Avatar 
                         src={item.avatar || undefined} 
                         fallback={(item.autorNome || 'U').substring(0, 2)} 
                         className="h-10 w-10 border border-white/20 rounded-full" 
                       />
                       <div>
                          <h3 className="text-sm font-bold text-ink-primary">{item.autorNome || 'Utilizador PDC'}</h3>
                          <p className="text-xs text-ink-tertiary flex items-center gap-1">
                             <Clock size={12} /> {new Date(item.createdAt).toLocaleDateString('pt-PT')}
                          </p>
                       </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.tipo === 'conquista' && (
                         <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs font-semibold">Conquista</Badge>
                      )}
                      <button className="p-1 text-ink-tertiary hover:text-ink-primary transition-colors">
                        <MoreHorizontal size={18} />
                      </button>
                    </div>
                 </div>

                 {/* Feed Content */}
                 <div className="px-5 pb-5 space-y-4">
                    <div className="space-y-2">
                        <h4 className="text-xl font-bold text-ink-primary leading-tight">
                          {item.titulo}
                        </h4>
                        <p className="text-ink-secondary text-sm leading-relaxed whitespace-pre-wrap">
                          {item.corpo || item.descricao}
                        </p>
                     </div>
 
                     {item.imagem && (
                        <div className="rounded-xl overflow-hidden border border-[var(--card-border)] aspect-video bg-recessed">
                           <img src={item.imagem} alt="" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                        </div>
                     )}
                 </div>

                 {/* Feed Footer Actions */}
                 <div className="px-5 py-4 border-t border-[var(--card-border)] flex items-center justify-between">
                    <div className="flex items-center gap-6">
                       <button className="flex items-center gap-2 text-ink-tertiary hover:text-accent transition-colors group/btn">
                          <Heart size={18} className="group-hover/btn:scale-110 transition-transform" />
                          <span className="text-sm font-medium">Gostar</span>
                       </button>
                       <button className="flex items-center gap-2 text-ink-tertiary hover:text-accent transition-colors group/btn">
                          <MessageSquare size={18} className="group-hover/btn:scale-110 transition-transform" />
                          <span className="text-sm font-medium">Comentar</span>
                       </button>
                    </div>
                    <div className="flex items-center gap-2">
                       <button className="p-2 text-ink-tertiary hover:text-accent transition-all"><Bookmark size={18} /></button>
                       <button className="p-2 text-ink-tertiary hover:text-accent transition-all"><Share2 size={18} /></button>
                    </div>
                 </div>

                 {item.tipo === 'conquista' && (
                    <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                       <Award size={100} className="text-accent" />
                    </div>
                 )}
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* End of feed */}
      <footer className="pt-6 flex justify-center">
         <p className="text-xs font-medium text-ink-tertiary flex items-center gap-2">
           <Zap size={14} className="text-accent" />
           Fim do feed. Actualizado agora.
         </p>
      </footer>
      </div>

      {/* Right Column - Activity Sidebar */}
      <div className="hidden lg:block lg:col-span-4">
        <FeedActivitySidebar />
      </div>
    </div>
  );
}

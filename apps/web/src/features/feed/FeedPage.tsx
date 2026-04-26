import { useQuery } from '@tanstack/react-query';
import { Card, Spinner, Avatar, Badge } from '@/components/ui';
import { Heart, MessageSquare, Share2, Award, Zap, Clock, Bookmark } from 'lucide-react';
import { http } from '@/lib/api/http';
import { motion } from 'motion/react';
import { APPLE_SPRING } from '@/lib/animations';
import type { FeedResponse, FeedItem } from '@pdc/shared';

export function FeedPage() {
  const { data, isLoading } = useQuery<FeedResponse>({
    queryKey: ['feed', 'sovereign'],
    queryFn: () => http.get<FeedResponse>('/feed'),
  });

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>;

  const items: FeedItem[] = data?.data ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-10 pb-20 animate-in fade-in duration-1000">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
        <div>
          <Badge variant="info" className="bg-accent/10 text-accent border-accent/20 mb-3 px-3 py-1 uppercase tracking-widest text-[9px] font-black">Social Pulse</Badge>
          <h1 className="text-4xl font-black text-text-primary tracking-tighter font-display">
            A Comunidade de <span className="text-accent">Mérito</span>
          </h1>
          <p className="text-text-secondary mt-2 max-w-lg leading-relaxed text-sm">
            Factos, conquistas e actualizações em tempo real do ecossistema soberano.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-8">
        {items.length === 0 ? (
          <Card className="p-20 text-center border-dashed border-white/10 bg-white/[0.01]">
            <Zap size={48} className="mx-auto text-text-muted mb-4 opacity-20" />
            <p className="text-sm text-text-muted uppercase font-black tracking-widest">O pulso social está silencioso...</p>
          </Card>
        ) : (
          items.map((item: FeedItem, idx: number) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...APPLE_SPRING, delay: idx * 0.05 }}
            >
              <Card className="group relative overflow-hidden bg-surface border-white/5 hover:border-accent/10 transition-all p-0 shadow-xl">
                 
                 {/* Feed Header */}
                  <div className="p-6 flex items-center justify-between border-b border-white/5 bg-white/[0.01]">
                    <div className="flex items-center gap-4">
                       <Avatar src={item.avatar || undefined} fallback={(item.autorNome || 'U').substring(0, 2)} className="h-10 w-10 border border-white/10" />
                       <div>
                          <h3 className="text-sm font-bold text-text-primary">{item.autorNome || 'Utilizador PDC'}</h3>
                          <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest flex items-center gap-1.5">
                             <Clock size={10} /> {new Date(item.createdAt).toLocaleDateString('pt-PT')}
                          </p>
                       </div>
                    </div>
                    {item.tipo === 'conquista' && (
                       <Badge className="bg-success/10 text-success border-success/20 uppercase text-[9px] font-black tracking-widest">Conquista</Badge>
                    )}
                 </div>

                 {/* Feed Content */}
                 <div className="p-8 space-y-6">
                    <div className="space-y-3">
                        <h4 className="text-2xl font-bold text-text-primary tracking-tight leading-tight group-hover:text-accent transition-colors">
                          {item.titulo}
                        </h4>
                        <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-wrap">
                          {item.corpo || item.descricao}
                        </p>
                     </div>
 
                     {item.imagem && (
                        <div className="rounded-[28px] overflow-hidden border border-white/5 aspect-video bg-surface-alt">
                           <img src={item.imagem} alt="" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-1000 opacity-80" />
                        </div>
                     )}
                 </div>

                 {/* Feed Footer Actions */}
                 <div className="px-6 py-4 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
                    <div className="flex items-center gap-6">
                       <button className="flex items-center gap-2 text-text-muted hover:text-accent transition-colors group/btn">
                          <Heart size={18} className="group-hover/btn:scale-110 transition-transform" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Validar</span>
                       </button>
                       <button className="flex items-center gap-2 text-text-muted hover:text-accent transition-colors group/btn">
                          <MessageSquare size={18} className="group-hover/btn:scale-110 transition-transform" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Comentar</span>
                       </button>
                    </div>
                    <div className="flex items-center gap-3">
                       <button className="p-2 text-text-muted hover:text-accent transition-all"><Bookmark size={18} /></button>
                       <button className="p-2 text-text-muted hover:text-accent transition-all"><Share2 size={18} /></button>
                    </div>
                 </div>

                 {item.tipo === 'conquista' && (
                    <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                       <Award size={140} className="text-accent" />
                    </div>
                 )}
              </Card>
            </motion.div>
          ))
        )}
      </div>

      <footer className="pt-10 flex justify-center opacity-30 group hover:opacity-100 transition-opacity">
         <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] flex items-center gap-2">
           <Zap size={14} className="text-accent" />
           Fim do fluxo. Actualizado agora.
         </p>
      </footer>
    </div>
  );
}

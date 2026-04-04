import { useQuery } from '@tanstack/react-query';
import { feedApi } from '@/lib/api/feed';
import { Spinner } from '@/components/ui/Spinner';
import { Link } from 'react-router-dom';
import { Star, Flame } from 'lucide-react';
import type { FeedItem } from '@pdc/shared';

export function TrendingSidebar() {
  const { data: items, isLoading } = useQuery({
    queryKey: ['feed', 'trending'],
    queryFn: () => feedApi.getTrending(),
  });

  if (isLoading) {
    return (
      <div className="bg-surface border border-border rounded-xl p-6 flex justify-center">
        <Spinner size="sm" />
      </div>
    );
  }

  const getLink = (item: FeedItem) => {
    switch (item.tipo) {
      case 'curso': return `/cursos/${item.slug ?? item.id}`;
      case 'simulacao': return `/simulacoes/${item.slug ?? item.id}`;
      case 'experiencia': return `/experiencias/${item.slug ?? item.id}`;
      case 'projeto': return `/projetos/${item.id}`;
      default: return '#';
    }
  };

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="p-4 border-b border-border bg-rose-500/5 flex items-center gap-2">
        <Flame className="w-4 h-4 text-rose-500 fill-rose-500" />
        <h2 className="text-sm font-bold text-text-primary tracking-tight uppercase">Em Alta agora</h2>
      </div>

      <div className="divide-y divide-border">
        {items?.map((item, idx) => (
          <Link
            key={item.id}
            to={getLink(item)}
            className="p-4 flex gap-3 hover:bg-white/5 transition-colors group"
          >
            <span className="text-xl font-black text-text-secondary/20 group-hover:text-amber/30 transition-colors shrink-0">
              {idx + 1}
            </span>
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-[10px] font-bold uppercase text-amber">
                {item.tipo}
              </span>
              <h3 className="text-sm font-bold text-text-primary leading-snug group-hover:text-amber transition-colors line-clamp-2">
                {item.titulo}
              </h3>
              <div className="flex items-center gap-2 text-[10px] text-text-secondary">
                <div className="flex items-center gap-0.5">
                  <Star className="w-3 h-3 text-amber fill-amber" />
                  <span>{item.stats.ratingMedia.toFixed(1)}</span>
                </div>
                <span>•</span>
                <span>{item.stats.likes} likes</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="p-4 bg-white/2 border-t border-border">
        <Link to="/explorar" className="text-xs font-bold text-amber hover:underline">
          Ver todas as tendências
        </Link>
      </div>
    </div>
  );
}

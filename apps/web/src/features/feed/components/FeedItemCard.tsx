import { motion } from 'framer-motion';
import { Star, ThumbsUp, Bookmark, ExternalLink } from 'lucide-react';
import type { FeedItem } from '@pdc/shared';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Link } from 'react-router-dom';

interface FeedItemCardProps {
  item: FeedItem;
}

export function FeedItemCard({ item }: FeedItemCardProps) {
  const getLink = () => {
    switch (item.tipo) {
      case 'curso': return `/cursos/${item.slug || item.id}`;
      case 'simulacao': return `/simulacoes/${item.slug || item.id}`;
      case 'experiencia': return `/experiencias/${item.slug || item.id}`;
      case 'projeto': return `/projetos/${item.id}`;
      default: return '#';
    }
  };

  const getTipoLabel = () => {
    switch (item.tipo) {
      case 'curso': return 'Curso';
      case 'simulacao': return 'Simulação';
      case 'experiencia': return 'Experiência';
      case 'projeto': return 'Projeto';
      default: return item.tipo;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface border border-border rounded-xl p-5 hover:border-amber/30 transition-colors group"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
            {getTipoLabel()}
          </span>
          <Link to={getLink()}>
            <h3 className="text-lg font-bold text-text-primary group-hover:text-amber transition-colors">
              {item.titulo}
            </h3>
          </Link>
        </div>
        {item.score > 0.5 && (
          <Badge variant="error" className="bg-rose-500/10 text-rose-500 border-rose-500/20">
            🔥 EM ALTA
          </Badge>
        )}
      </div>

      <p className="text-sm text-text-secondary line-clamp-2 mb-4">
        {item.descricao}
      </p>

      <div className="flex items-center gap-4 mb-5 text-xs text-text-secondary">
        <div className="flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 text-amber fill-amber" />
          <span className="font-medium text-text-primary">{item.stats.ratingMedia.toFixed(1)}</span>
          <span>({item.stats.ratingTotal})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ThumbsUp className="w-3.5 h-3.5" />
          <span>{item.stats.likes}</span>
        </div>
        {item.area && (
          <Badge variant="outline" className="text-[10px]">
            {item.area}
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-between border-top border-border pt-4 mt-auto">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-amber/20 flex items-center justify-center text-[10px] font-bold text-amber">
            {item.autorNome?.substring(0, 1).toUpperCase() || 'P'}
          </div>
          <span className="text-xs font-medium text-text-secondary truncate max-w-[120px]">
            {item.autorNome || 'PDC'}
          </span>
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Bookmark className="w-4 h-4" />
          </Button>
          <Button asChild variant="secondary" size="sm" className="h-8 gap-1.5 text-xs">
            <Link to={getLink()}>
              Explorar <ExternalLink className="w-3 h-3" />
            </Link>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

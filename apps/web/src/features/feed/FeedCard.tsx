import { Star, ThumbsUp, ExternalLink } from 'lucide-react';
import type { FeedItem, InteractionTargetType } from '@pdc/shared';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LikeButton } from '@/components/ui/LikeButton';
import { BookmarkButton } from '@/components/ui/BookmarkButton';
import { Link } from 'react-router-dom';

const TIPO_LABELS: Record<string, string> = {
  curso: 'Curso',
  simulacao: 'Simulação',
  experiencia: 'Experiência',
  projeto: 'Projeto',
};

const ACTION_LABELS: Record<string, string> = {
  curso: 'Aceder',
  simulacao: 'Iniciar',
  experiencia: 'Ver',
  projeto: 'Abrir',
};

function getLink(item: FeedItem): string {
  switch (item.tipo) {
    case 'curso': return `/cursos/${item.slug ?? item.id}`;
    case 'simulacao': return `/simulacoes/${item.slug ?? item.id}`;
    case 'experiencia': return `/experiencias/${item.slug ?? item.id}`;
    case 'projeto': return `/projetos/${item.id}`;
    default: return '#';
  }
}

export function FeedCard({ item }: { item: FeedItem }) {
  return (
    <div className="py-5 border-b border-border/40 hover:bg-surface-raised transition-colors group">
      <div className="flex justify-between items-start mb-3">
        <div className="flex flex-col gap-1">
          <Badge variant="outline" className="w-fit text-[10px] font-bold uppercase tracking-wider border-none bg-surface-raised/50">
            {TIPO_LABELS[item.tipo] ?? item.tipo}
          </Badge>
          <Link to={getLink(item)}>
            <h3 className="text-lg font-bold text-text-primary group-hover:text-amber transition-colors leading-snug">
              {item.titulo}
            </h3>
          </Link>
        </div>
        {item.area && (
          <Badge variant="default" className="shrink-0 text-[10px]">
            {item.area}
          </Badge>
        )}
      </div>

      <p className="text-sm text-text-secondary line-clamp-2 mb-4">
        {item.descricao}
      </p>

      <div className="flex items-center gap-4 mb-4 text-xs text-text-secondary">
        <div className="flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 text-amber fill-amber" />
          <span className="font-medium text-text-primary">{(item.stats?.ratingMedia ?? 0).toFixed(1)}</span>
          <span>({String(item.stats?.ratingTotal ?? 0)})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ThumbsUp className="w-3.5 h-3.5" />
          <span>{String(item.stats?.likes ?? 0)}</span>
        </div>
        {item.stats?.completionRate != null && (
          <span>{String(Math.round(item.stats.completionRate * 100))}% completo</span>
        )}
        {item.autorNome && (
          <>
            <span>•</span>
            <span>{item.autorNome}</span>
          </>
        )}
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <LikeButton
            targetType={item.tipo as InteractionTargetType}
            targetId={item.id}
            initialCount={item.stats?.likes ?? 0}
          />
          <BookmarkButton
            targetType={item.tipo as InteractionTargetType}
            targetId={item.id}
          />
        </div>
        <Link to={getLink(item)}>
          <Button size="sm" variant="ghost" className="gap-1.5 text-amber">
            <ExternalLink className="w-3.5 h-3.5" />
            {ACTION_LABELS[item.tipo] ?? 'Ver'}
          </Button>
        </Link>
      </div>
    </div>
  );
}

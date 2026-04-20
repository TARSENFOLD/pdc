import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ratingsApi } from '@/lib/api/interactions';
import type { InteractionTargetType, RatingStats } from '@pdc/shared';

export interface RatingStarsProps {
  targetType: InteractionTargetType;
  targetId: string;
  readOnly?: boolean | undefined;
  stats?: RatingStats | undefined;
}

export function RatingStars({ targetType, targetId, readOnly = false, stats }: RatingStarsProps) {
  const [hoverValue, setHoverValue] = useState(0);
  const [rating, setRating] = useState(stats?.userRating ?? 0);
  const qc = useQueryClient();

  const rateMutation = useMutation({
    mutationFn: (valor: number) => ratingsApi.create({ targetType, targetId, valor }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [targetType, targetId, 'ratings'] });
    }
  });

  const displayRating = hoverValue > 0 ? hoverValue : (rating || (stats?.media ?? 0));

  const handleClick = (value: number) => {
    if (readOnly) return;
    setRating(value);
    rateMutation.mutate(value);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center" onMouseLeave={() => { if (!readOnly) setHoverValue(0); }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            onClick={() => { handleClick(star); }}
            onMouseEnter={() => { if (!readOnly) setHoverValue(star); }}
            className={`p-0.5 rounded-sm focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110 transition-transform'}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill={star <= displayRating ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`w-5 h-5 ${star <= displayRating ? 'text-accent' : 'text-ink-tertiary/20'}`}
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        ))}
      </div>
      
      {stats && (
        <span className="text-sm text-ink-tertiary font-medium">
          {stats.media > 0 ? stats.media.toFixed(1) : 'Sem avaliações'} 
          {stats.total > 0 && <span className="ml-1 opacity-70">({stats.total})</span>}
        </span>
      )}
    </div>
  );
}

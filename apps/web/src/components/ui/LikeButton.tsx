import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { likeApi } from '@/lib/api/interactions';
import type { InteractionTargetType } from '@pdc/shared';
import { Button } from './Button';

export interface LikeButtonProps {
  targetType: InteractionTargetType;
  targetId: string;
  initialCount?: number | undefined;
  initialLiked?: boolean | undefined;
}

export function LikeButton({ targetType, targetId, initialCount = 0, initialLiked = false }: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const qc = useQueryClient();

  // Optimistic UI toggle
  const toggleMutation = useMutation({
    mutationFn: () => likeApi.toggle({ targetType, targetId }),
    onMutate: () => {
      setLiked(!liked);
      setCount(prev => (liked ? Math.max(0, prev - 1) : prev + 1));
    },
    onError: () => {
      // Revert optimism if failed
      setLiked(liked);
      setCount(count);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [targetType, targetId, 'likes'] });
    }
  });

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`gap-2 ${liked ? 'text-error border-error bg-error/10' : 'text-text-muted hover:text-error'}`}
      onClick={() => { toggleMutation.mutate(); }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={liked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-4 h-4"
      >
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
      {count > 0 && <span className="font-semibold">{count}</span>}
    </Button>
  );
}

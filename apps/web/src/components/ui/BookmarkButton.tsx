import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bookmarkApi } from '@/lib/api/interactions';
import type { InteractionTargetType } from '@pdc/shared';
import { Button } from './Button';

export interface BookmarkButtonProps {
  targetType: InteractionTargetType;
  targetId: string;
  initialBookmarked?: boolean;
}

export function BookmarkButton({ targetType, targetId, initialBookmarked = false }: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const qc = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: () => bookmarkApi.toggle({ targetType, targetId }),
    onMutate: () => {
      setBookmarked(!bookmarked);
    },
    onError: () => {
      setBookmarked(bookmarked); // Revert
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['bookmarks'] });
      void qc.invalidateQueries({ queryKey: [targetType, targetId, 'bookmark'] });
    }
  });

  return (
    <Button
      variant="ghost"
      size="sm"
      className={bookmarked ? 'text-primary border-primary bg-primary/10' : 'text-text-muted hover:text-primary'}
      onClick={() => { toggleMutation.mutate(); }}
      aria-label="Guardar items"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={bookmarked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-4 h-4"
      >
        <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
      </svg>
    </Button>
  );
}

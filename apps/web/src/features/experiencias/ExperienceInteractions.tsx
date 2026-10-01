import { useQuery } from '@tanstack/react-query';
import { LikeButton, BookmarkButton, RatingStars } from '@/components/ui';
import { likeApi, bookmarkApi, ratingsApi } from '@/lib/api/interactions';

export function ExperienceInteractions({ id }: { id: string }) {
  const likes = useQuery({
    queryKey: ['experiencia', id, 'likes'],
    queryFn: () => likeApi.getStatus('experiencia', id),
  });
  const bookmark = useQuery({
    queryKey: ['experiencia', id, 'bookmark'],
    queryFn: () => bookmarkApi.getStatus('experiencia', id),
  });
  const ratings = useQuery({
    queryKey: ['experiencia', id, 'ratings'],
    queryFn: () => ratingsApi.getStats('experiencia', id),
  });
  return (
    <div className="flex flex-wrap items-center gap-3">
      {ratings.data && (
        <RatingStars
          key={`${id}:${ratings.data.userRating}`}
          targetType="experiencia"
          targetId={id}
          stats={ratings.data}
        />
      )}
      {likes.data && (
        <LikeButton
          key={`${id}:${likes.data.liked}`}
          targetType="experiencia"
          targetId={id}
          initialLiked={likes.data.liked}
          initialCount={likes.data.count}
        />
      )}
      {bookmark.data && (
        <BookmarkButton
          key={`${id}:${bookmark.data.bookmarked}`}
          targetType="experiencia"
          targetId={id}
          initialBookmarked={bookmark.data.bookmarked}
        />
      )}
    </div>
  );
}

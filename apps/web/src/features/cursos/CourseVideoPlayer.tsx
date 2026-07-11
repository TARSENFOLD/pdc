import { useQuery } from '@tanstack/react-query';
import { Spinner } from '@/components/ui';
import { videosApi } from '@/lib/api/videos';

function youtubeEmbedUrl(src: string): string | null {
  const isYoutube = src.includes('youtube.com') || src.includes('youtu.be');
  if (!isYoutube) return null;
  try {
    const url = new URL(src);
    const videoId = url.searchParams.get('v') ?? url.pathname.split('/').at(-1);
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  } catch {
    const videoId = src.split('/').at(-1);
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  }
}

function NativeOrEmbedVideo({ src }: { src: string }) {
  const youtubeUrl = youtubeEmbedUrl(src);
  if (youtubeUrl) {
    return (
      <iframe
        src={youtubeUrl}
        className="h-full w-full rounded-lg"
        allowFullScreen
        title="Vídeo"
      />
    );
  }
  return <video src={src} controls className="h-full w-full rounded-lg" />;
}

export function CourseVideoPlayer({
  src,
  videoId,
  courseId,
}: {
  src?: string | undefined;
  videoId?: string | undefined;
  courseId: string;
}) {
  const playback = useQuery({
    queryKey: ['videos', videoId ?? '', 'playback', courseId],
    queryFn: () => videosApi.playback(videoId ?? '', courseId),
    enabled: Boolean(videoId),
    retry: false,
  });

  if (videoId && playback.isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-lg bg-recessed">
        <Spinner />
      </div>
    );
  }

  if (videoId && playback.isError) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-lg bg-recessed px-6 text-center text-sm text-error">
        Vídeo indisponível para reprodução.
      </div>
    );
  }

  const playbackUrl = playback.data?.playbackUrl ?? src;
  if (!playbackUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-lg bg-recessed px-6 text-center text-sm text-ink-secondary">
        Vídeo sem fonte configurada.
      </div>
    );
  }

  return <NativeOrEmbedVideo src={playbackUrl} />;
}

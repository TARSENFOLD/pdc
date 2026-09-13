import { useRef } from 'react';
import { safeRenderableUrl, type CursoItemImagem } from '@pdc/shared';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui';

interface CourseItemGalleryProps {
  images: CursoItemImagem[];
}

export function CourseItemGallery({ images }: CourseItemGalleryProps): React.JSX.Element | null {
  const trackRef = useRef<HTMLDivElement>(null);
  if (images.length === 0) return null;
  const renderableImages = images.flatMap((image) => {
    const url = safeRenderableUrl(image.url, { allowLocalHttp: import.meta.env.DEV });
    return url ? [{ ...image, url }] : [];
  });
  if (renderableImages.length === 0) {
    return (
      <p className="text-ink-tertiary text-sm">
        As imagens desta aula não têm um endereço seguro disponível.
      </p>
    );
  }

  const scroll = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth * 0.85, behavior: 'smooth' });
  };

  return (
    <section className="relative" aria-label="Imagens desta aula">
      <div
        ref={trackRef}
        data-testid="course-item-gallery-track"
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain rounded-lg pb-2"
      >
        {renderableImages.map((image, index) => (
          <figure
            key={`${image.url}-${String(index)}`}
            className={
              renderableImages.length === 1
                ? 'w-full shrink-0 snap-center'
                : 'w-[88%] shrink-0 snap-center sm:w-[82%]'
            }
          >
            <div className="border-border bg-recessed aspect-video overflow-hidden rounded-lg border">
              <img src={image.url} alt={image.alt} className="h-full w-full object-cover" />
            </div>
            <figcaption className="sr-only">{image.alt}</figcaption>
          </figure>
        ))}
      </div>

      {renderableImages.length > 1 ? (
        <div className="border-border bg-canvas/90 absolute right-3 bottom-5 flex gap-1 rounded-lg border p-1 shadow-[var(--elevation-1)] backdrop-blur">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              scroll(-1);
            }}
            aria-label="Imagem anterior"
          >
            <ChevronLeft size={17} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              scroll(1);
            }}
            aria-label="Imagem seguinte"
          >
            <ChevronRight size={17} />
          </Button>
        </div>
      ) : null}
    </section>
  );
}

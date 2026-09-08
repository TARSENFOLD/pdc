import { useRef } from 'react';
import type { CursoItemImagem } from '@pdc/shared';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui';

interface CourseItemGalleryProps {
  images: CursoItemImagem[];
}

export function CourseItemGallery({ images }: CourseItemGalleryProps): React.JSX.Element | null {
  const trackRef = useRef<HTMLDivElement>(null);
  if (images.length === 0) return null;

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
        {images.map((image, index) => (
          <figure
            key={`${image.url}-${String(index)}`}
            className={images.length === 1 ? 'w-full shrink-0 snap-center' : 'w-[88%] shrink-0 snap-center sm:w-[82%]'}
          >
            <div className="aspect-video overflow-hidden rounded-lg border border-border bg-recessed">
              <img src={image.url} alt={image.alt} className="h-full w-full object-cover" />
            </div>
            <figcaption className="sr-only">{image.alt}</figcaption>
          </figure>
        ))}
      </div>

      {images.length > 1 ? (
        <div className="absolute bottom-5 right-3 flex gap-1 rounded-lg border border-border bg-canvas/90 p-1 shadow-[var(--elevation-1)] backdrop-blur">
          <Button type="button" variant="ghost" size="sm" onClick={() => { scroll(-1); }} aria-label="Imagem anterior"><ChevronLeft size={17} /></Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => { scroll(1); }} aria-label="Imagem seguinte"><ChevronRight size={17} /></Button>
        </div>
      ) : null}
    </section>
  );
}

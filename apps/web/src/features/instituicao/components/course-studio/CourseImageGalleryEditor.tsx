import { useState } from 'react';
import {
  CURSO_ITEM_IMAGEM_ALT_MAX_LENGTH,
  CURSO_ITEM_IMAGEM_ALT_MIN_LENGTH,
  type CursoItemImagem,
} from '@pdc/shared';
import { ChevronLeft, ChevronRight, Images, Trash2 } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { SovereignMediaUpload } from '../SovereignMediaUpload';

interface CourseImageGalleryEditorProps {
  images: CursoItemImagem[];
  onChange: (images: CursoItemImagem[]) => void;
}

export function CourseImageGalleryEditor({
  images,
  onChange,
}: CourseImageGalleryEditorProps): React.JSX.Element {
  const [uploaderKey, setUploaderKey] = useState(0);

  const addImage = (url: string) => {
    onChange([...images, { url, alt: '' }]);
    setUploaderKey((current) => current + 1);
  };

  const updateAlt = (index: number, alt: string) => {
    onChange(images.map((image, imageIndex) => imageIndex === index ? { ...image, alt } : image));
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    const current = next[index];
    const replacement = next[target];
    if (!current || !replacement) return;
    next[index] = replacement;
    next[target] = current;
    onChange(next);
  };

  return (
    <section className="space-y-3 rounded-lg border border-border bg-canvas p-4" aria-label="Galeria da aula">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h5 className="flex items-center gap-2 text-sm font-semibold text-ink-primary">
            <Images size={16} className="text-accent" aria-hidden="true" /> Imagens apresentadas antes do conteúdo
          </h5>
          <p className="mt-1 text-xs leading-5 text-ink-tertiary">
            Uma imagem ocupa o topo da aula. Duas ou mais formam uma galeria com deslocação horizontal.
          </p>
        </div>
        <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-tertiary">
          {images.length} {images.length === 1 ? 'imagem' : 'imagens'}
        </span>
      </div>

      {images.length > 0 ? (
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3" aria-label="Ordem das imagens">
          {images.map((image, index) => (
            <article key={`${image.url}-${String(index)}`} className="w-64 shrink-0 snap-start overflow-hidden rounded-lg border border-border bg-elevated">
              <img src={image.url} alt={image.alt} className="aspect-video w-full object-cover" />
              <div className="space-y-3 p-3">
                <Input
                  id={`course-gallery-alt-${String(index)}`}
                  label={`Descrição acessível da imagem ${String(index + 1)}`}
                  value={image.alt}
                  placeholder="Ex.: Estudantes a colaborar num projeto"
                  onChange={(event) => { updateAlt(index, event.currentTarget.value); }}
                  error={image.alt.trim().length < CURSO_ITEM_IMAGEM_ALT_MIN_LENGTH
                    ? `Adiciona uma descrição acessível com pelo menos ${String(CURSO_ITEM_IMAGEM_ALT_MIN_LENGTH)} caracteres.`
                    : image.alt.trim().length > CURSO_ITEM_IMAGEM_ALT_MAX_LENGTH
                      ? `A descrição acessível pode ter no máximo ${String(CURSO_ITEM_IMAGEM_ALT_MAX_LENGTH)} caracteres.`
                      : undefined}
                />
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    <Button type="button" variant="ghost" size="sm" disabled={index === 0} onClick={() => { moveImage(index, -1); }} aria-label={`Mover imagem ${String(index + 1)} para a esquerda`}><ChevronLeft size={15} /></Button>
                    <Button type="button" variant="ghost" size="sm" disabled={index === images.length - 1} onClick={() => { moveImage(index, 1); }} aria-label={`Mover imagem ${String(index + 1)} para a direita`}><ChevronRight size={15} /></Button>
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="text-error" onClick={() => { onChange(images.filter((_, imageIndex) => imageIndex !== index)); }} aria-label={`Remover imagem ${String(index + 1)}`}><Trash2 size={15} /></Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <div className="max-w-sm">
        <SovereignMediaUpload
          key={uploaderKey}
          accept="image/jpeg,image/png,image/webp"
          maxSizeMB={10}
          entityType="generic"
          onSuccess={addImage}
        />
      </div>
    </section>
  );
}

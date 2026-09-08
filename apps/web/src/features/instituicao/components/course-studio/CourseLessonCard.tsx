import { useState, type ChangeEvent, type DragEvent } from 'react';
import { useWatch, type Control, type UseFormRegister, type UseFormSetValue, type UseFormTrigger } from 'react-hook-form';
import { avaliarProntidaoAula, type CriarCursoPayload } from '@pdc/shared';
import { ChevronDown, ChevronUp, Copy, GripVertical, Pencil, Trash2 } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { SovereignMediaUpload } from '../SovereignMediaUpload';
import { CourseVideoUpload } from './CourseVideoUpload';
import { CourseImageGalleryEditor } from './CourseImageGalleryEditor';
import { COURSE_ITEM_TYPES, getCourseContentGuidance, getCourseItemType, isCourseItemType, type CourseItemType } from './course-curriculum';

interface CourseLessonCardProps {
  moduleIndex: number;
  itemIndex: number;
  control: Control<CriarCursoPayload>;
  register: UseFormRegister<CriarCursoPayload>;
  setValue: UseFormSetValue<CriarCursoPayload>;
  trigger: UseFormTrigger<CriarCursoPayload>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  canDelete: boolean;
  canDuplicate: boolean;
  videoTypeAvailable: boolean;
  onMove: (direction: -1 | 1) => void;
  onDuplicate: () => void;
  onTypeChange: (type: CourseItemType) => void;
  onRequestDelete: () => void;
  onDragStart: (event: DragEvent<HTMLButtonElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
}

export function CourseLessonCard({
  moduleIndex,
  itemIndex,
  control,
  register,
  setValue,
  trigger,
  open,
  onOpenChange,
  canMoveUp,
  canMoveDown,
  canDelete,
  canDuplicate,
  videoTypeAvailable,
  onMove,
  onDuplicate,
  onTypeChange,
  onRequestDelete,
  onDragStart,
  onDrop,
}: CourseLessonCardProps): React.JSX.Element | null {
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const basePath: `modulos.${number}.itens.${number}` = `modulos.${moduleIndex}.itens.${itemIndex}`;
  const item = useWatch<CriarCursoPayload, typeof basePath>({ control, name: basePath });
  if (!item) return null;

  const typeOption = getCourseItemType(item.tipo);
  const guidance = getCourseContentGuidance(item.tipo);
  const TypeIcon = typeOption.icon;
  const needsUrl = item.tipo === 'video' || item.tipo === 'pdf' || item.tipo === 'iframe';

  const closeEditor = () => {
    void trigger(basePath)
      .then((valid) => {
        if (valid) {
          setValidationMessage(null);
          onOpenChange(false);
          return;
        }
        const lessonLabel = `${String(moduleIndex + 1)}.${String(itemIndex + 1)}`;
        const firstIssue = avaliarProntidaoAula(
          item,
          lessonLabel,
          { allowLocalHttp: import.meta.env.DEV },
        )[0];
        setValidationMessage(firstIssue?.message ?? 'Completa os campos obrigatórios desta aula antes de fechar a edição.');
      })
      .catch(() => {
        setValidationMessage('Não foi possível validar esta aula. Tenta novamente.');
      });
  };

  const toggleEditor = () => {
    if (open) closeEditor();
    else onOpenChange(true);
  };

  return (
    <article
      id={`course-module-${String(moduleIndex)}-item-${String(itemIndex)}`}
      className="overflow-hidden rounded-lg border border-border bg-canvas transition-colors focus-within:border-ink-tertiary/40"
      onDragOver={(event) => { event.preventDefault(); }}
      onDrop={onDrop}
    >
      <div className="flex min-h-16 items-center gap-2 px-3 sm:px-4">
        <button
          type="button"
          draggable
          onDragStart={onDragStart}
          className="flex min-h-11 min-w-8 cursor-grab items-center justify-center text-ink-tertiary hover:text-ink-primary active:cursor-grabbing"
          aria-label={`Arrastar aula ${String(itemIndex + 1)}`}
          title="Arrastar para ordenar"
        >
          <GripVertical size={17} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={toggleEditor}
          className="flex min-w-0 flex-1 items-center gap-3 py-3 text-left"
          aria-expanded={open}
        >
          <span className="flex h-10 min-w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-accent/10 px-2 text-accent">
            <span className="text-[10px] font-bold leading-none">{moduleIndex + 1}.{itemIndex + 1}</span>
            <TypeIcon size={15} className="mt-1" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-ink-primary">{item.titulo}</span>
            <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-wider text-ink-tertiary">{typeOption.label}</span>
          </span>
        </button>
        <button type="button" onClick={toggleEditor} className="flex min-h-11 min-w-10 items-center justify-center text-ink-tertiary" aria-label={open ? 'Fechar aula' : 'Editar aula'}>
          {open ? <ChevronUp size={18} /> : <Pencil size={16} />}
        </button>
      </div>

      {open ? (
        <div className="space-y-6 border-t border-border bg-elevated p-4 sm:p-6">
          <div className="grid gap-4 md:grid-cols-[170px_minmax(0,1fr)]">
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-ink-secondary">Formato</span>
              <select
                {...register(`${basePath}.tipo`, {
                  onChange: (event: ChangeEvent<HTMLSelectElement>) => {
                    if (isCourseItemType(event.currentTarget.value)) {
                      onTypeChange(event.currentTarget.value);
                    }
                  },
                })}
                value={item.tipo}
                className="h-11 w-full rounded-md border border-ink-tertiary/20 bg-recessed px-3 text-sm text-ink-primary outline-none focus:ring-2 focus:ring-accent"
              >
                {COURSE_ITEM_TYPES.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    disabled={!option.publishable || (option.value === 'video' && !videoTypeAvailable)}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
              {item.tipo === 'video'
                ? <span className="block text-xs leading-5 text-ink-tertiary">Vídeo de abertura: permanece sempre no início deste módulo.</span>
                : null}
            </label>
            <Input label="Título da aula" {...register(`${basePath}.titulo`)} />
          </div>

          {needsUrl ? (
            <Input
              label={item.tipo === 'iframe' ? 'URL para incorporar' : 'URL externa (opcional)'}
              placeholder="https://"
              {...register(`${basePath}.url`)}
            />
          ) : null}

          {item.tipo === 'video' ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <CourseVideoUpload
                title={item.titulo}
                onVideoReady={(videoId) => { setValue(`${basePath}.videoId`, videoId, { shouldDirty: true, shouldValidate: true }); }}
              />
              <Input label="ID do vídeo PDC" placeholder="Preenchido após o envio" {...register(`${basePath}.videoId`)} />
            </div>
          ) : null}

          {item.tipo === 'pdf' ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-ink-secondary">Enviar documento</p>
              <SovereignMediaUpload
                accept="application/pdf"
                maxSizeMB={50}
                entityType="generic"
                onSuccess={(url) => { setValue(`${basePath}.url`, url, { shouldDirty: true, shouldValidate: true }); }}
              />
            </div>
          ) : null}

          {item.tipo !== 'iframe' ? (
            <CourseImageGalleryEditor
              images={item.imagens ?? []}
              onChange={(images) => { setValue(`${basePath}.imagens`, images, { shouldDirty: true, shouldValidate: true }); }}
            />
          ) : null}

          {item.tipo !== 'iframe' ? (
            <div>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-ink-secondary">{guidance.label}</span>
                <span className="block text-xs leading-5 text-ink-tertiary">{guidance.helper}</span>
                <textarea
                  {...register(`${basePath}.conteudo`)}
                  placeholder={guidance.placeholder}
                  className="min-h-48 w-full rounded-md border border-ink-tertiary/20 bg-recessed px-4 py-3 text-sm leading-6 text-ink-primary outline-none transition-colors focus:ring-2 focus:ring-accent"
                />
              </label>
            </div>
          ) : null}

          <div className="space-y-3 border-t border-border pt-5">
            {validationMessage ? (
              <p role="alert" className="rounded-md border border-error/30 bg-error/5 px-4 py-3 text-xs text-error">
                {validationMessage}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-1">
                <Button type="button" variant="ghost" size="sm" disabled={!canMoveUp} onClick={() => { onMove(-1); }} aria-label="Mover aula para cima"><ChevronUp size={16} /></Button>
                <Button type="button" variant="ghost" size="sm" disabled={!canMoveDown} onClick={() => { onMove(1); }} aria-label="Mover aula para baixo"><ChevronDown size={16} /></Button>
                <Button type="button" variant="ghost" size="sm" disabled={!canDuplicate} onClick={onDuplicate} aria-label="Duplicar aula"><Copy size={15} /></Button>
                <Button type="button" variant="ghost" size="sm" disabled={!canDelete} onClick={onRequestDelete} aria-label="Eliminar aula" className="text-error"><Trash2 size={15} /></Button>
              </div>
              <Button type="button" size="sm" onClick={closeEditor} className="ml-auto">Validar e fechar aula</Button>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}

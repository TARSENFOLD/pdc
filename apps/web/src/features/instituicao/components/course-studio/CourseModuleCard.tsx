import { useEffect, useState, type DragEvent } from 'react';
import { useFieldArray, useWatch, type Control, type UseFormRegister, type UseFormSetValue, type UseFormTrigger } from 'react-hook-form';
import type { CriarCursoPayload } from '@pdc/shared';
import { ChevronDown, ChevronUp, Copy, GripVertical, Layers3, Plus, Trash2 } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { CourseContentTypePicker } from './CourseContentTypePicker';
import { CourseDeleteDialog } from './CourseDeleteDialog';
import { CourseLessonCard } from './CourseLessonCard';
import { createCourseItem, duplicateCourseItem, normalizeCourseItems, type CourseItemType } from './course-curriculum';

interface CourseModuleCardProps {
  moduleIndex: number;
  totalModules: number;
  control: Control<CriarCursoPayload>;
  register: UseFormRegister<CriarCursoPayload>;
  setValue: UseFormSetValue<CriarCursoPayload>;
  trigger: UseFormTrigger<CriarCursoPayload>;
  onMove: (direction: -1 | 1) => void;
  onDuplicate: () => void;
  onRequestDelete: () => void;
  onDragStart: (event: DragEvent<HTMLButtonElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
  initiallyOpen?: boolean;
}

function modulePath(index: number): `modulos.${number}` {
  return `modulos.${String(index)}` as `modulos.${number}`;
}

export function CourseModuleCard({
  moduleIndex,
  totalModules,
  control,
  register,
  setValue,
  trigger,
  onMove,
  onDuplicate,
  onRequestDelete,
  onDragStart,
  onDrop,
  initiallyOpen = false,
}: CourseModuleCardProps): React.JSX.Element | null {
  const [open, setOpen] = useState(moduleIndex === 0 || initiallyOpen);
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(moduleIndex === 0 || initiallyOpen ? 0 : null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [deleteItemIndex, setDeleteItemIndex] = useState<number | null>(null);
  const [newItemIndex, setNewItemIndex] = useState<number | null>(null);
  const currentModulePath = modulePath(moduleIndex);
  const module = useWatch({ control, name: currentModulePath });
  const itemsArray = useFieldArray({
    control,
    name: `${currentModulePath}.itens`,
    keyName: 'fieldKey',
  });
  useEffect(() => {
    if (newItemIndex === null) return;
    document.getElementById(`course-module-${String(moduleIndex)}-item-${String(newItemIndex)}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setNewItemIndex(null);
  }, [itemsArray.fields.length, moduleIndex, newItemIndex]);

  if (!module) return null;

  const replaceItems = (nextItems: typeof module.itens) => {
    itemsArray.replace(normalizeCourseItems(nextItems));
  };

  const moveItemTo = (sourceIndex: number, targetIndex: number) => {
    if (
      sourceIndex === targetIndex
      || sourceIndex < 0
      || targetIndex < 0
      || sourceIndex >= module.itens.length
      || targetIndex >= module.itens.length
    ) return;
    const movedItem = module.itens[sourceIndex];
    if (!movedItem) return;
    const reordered = [...module.itens];
    reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, movedItem);
    const normalizedReferences = [
      ...reordered.filter((item) => item.tipo === 'video'),
      ...reordered.filter((item) => item.tipo !== 'video'),
    ];
    replaceItems(reordered);
    setActiveItemIndex(normalizedReferences.indexOf(movedItem));
  };

  const moveItem = (itemIndex: number, direction: -1 | 1) => {
    moveItemTo(itemIndex, itemIndex + direction);
  };

  const duplicateItem = (itemIndex: number) => {
    const source = module.itens[itemIndex];
    if (!source || source.tipo === 'video') return;
    const next = [...module.itens];
    next.splice(itemIndex + 1, 0, duplicateCourseItem(source, itemIndex + 2));
    replaceItems(next);
    setActiveItemIndex(itemIndex + 1);
  };

  const addItem = (type: CourseItemType) => {
    if (type === 'video' && module.itens.some((item) => item.tipo === 'video')) return;
    const targetIndex = type === 'video' ? 0 : module.itens.length;
    setNewItemIndex(targetIndex);
    replaceItems(type === 'video'
      ? [createCourseItem(type, 1), ...module.itens]
      : [...module.itens, createCourseItem(type, module.itens.length + 1)]);
    setPickerOpen(false);
    setOpen(true);
    setActiveItemIndex(targetIndex);
  };

  const changeItemType = (itemIndex: number, type: CourseItemType) => {
    const source = module.itens[itemIndex];
    if (!source || source.tipo === type) return;
    if (type === 'video' && module.itens.some((item, index) => index !== itemIndex && item.tipo === 'video')) return;
    const nextItems = module.itens.map((item, index) => index === itemIndex ? { ...item, tipo: type } : item);
    replaceItems(nextItems);
    setActiveItemIndex(type === 'video' ? 0 : itemIndex);
  };

  const dropItem = (event: DragEvent<HTMLElement>, targetIndex: number) => {
    event.preventDefault();
    const [sourceModule, sourceIndex] = event.dataTransfer.getData('application/x-pdc-course-item').split(':').map(Number);
    if (sourceModule !== moduleIndex || sourceIndex === undefined || !Number.isInteger(sourceIndex)) return;
    moveItemTo(sourceIndex, targetIndex);
  };

  return (
    <article
      id={`course-module-${String(moduleIndex)}`}
      className="overflow-hidden rounded-xl border border-border bg-elevated shadow-[var(--elevation-1)]"
      onDragOver={(event) => { event.preventDefault(); }}
      onDrop={onDrop}
    >
      <header className="flex min-h-[76px] items-center gap-2 border-b border-border bg-canvas px-3 sm:px-5">
        <button
          type="button"
          draggable
          onDragStart={onDragStart}
          className="flex min-h-11 min-w-8 cursor-grab items-center justify-center text-ink-tertiary hover:text-ink-primary active:cursor-grabbing"
          aria-label={`Arrastar módulo ${String(moduleIndex + 1)}`}
          title="Arrastar para ordenar"
        >
          <GripVertical size={18} aria-hidden="true" />
        </button>
        <button type="button" onClick={() => { setOpen((current) => !current); }} className="flex min-w-0 flex-1 items-center gap-3 py-3 text-left" aria-expanded={open}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-sm font-bold text-accent">{moduleIndex + 1}</span>
          <span className="min-w-0">
            <span className="block truncate text-base font-bold text-ink-primary">{module.titulo}</span>
            <span className="mt-0.5 block text-xs text-ink-tertiary">{module.itens.length} {module.itens.length === 1 ? 'aula' : 'aulas'}</span>
          </span>
        </button>
        <button type="button" onClick={() => { setOpen((current) => !current); }} className="flex min-h-11 min-w-10 items-center justify-center text-ink-tertiary" aria-label={open ? 'Recolher módulo' : 'Expandir módulo'}>
          {open ? <ChevronUp size={19} /> : <ChevronDown size={19} />}
        </button>
      </header>

      {open ? (
        <div className="space-y-6 p-4 sm:p-6">
          <div className="grid gap-4 border-b border-border pb-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <Input label="Nome do módulo" {...register(`${currentModulePath}.titulo`)} />
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="sm" disabled={moduleIndex === 0} onClick={() => { onMove(-1); }} aria-label="Mover módulo para cima"><ChevronUp size={16} /></Button>
              <Button type="button" variant="ghost" size="sm" disabled={moduleIndex === totalModules - 1} onClick={() => { onMove(1); }} aria-label="Mover módulo para baixo"><ChevronDown size={16} /></Button>
              <Button type="button" variant="ghost" size="sm" onClick={onDuplicate} aria-label="Duplicar módulo"><Copy size={15} /></Button>
              <Button type="button" variant="ghost" size="sm" disabled={totalModules === 1} onClick={onRequestDelete} aria-label="Eliminar módulo" className="text-error"><Trash2 size={15} /></Button>
            </div>
          </div>

          <div>
            <div>
              <h4 className="flex items-center gap-2 text-sm font-bold text-ink-primary"><Layers3 size={16} className="text-accent" /> Aulas do módulo</h4>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-ink-tertiary">Cada aula será uma página independente no consumo. Abre apenas a aula que queres editar.</p>
            </div>
          </div>

          <div className="space-y-3">
            {itemsArray.fields.map((field, itemIndex) => (
              <CourseLessonCard
                key={field.fieldKey}
                moduleIndex={moduleIndex}
                itemIndex={itemIndex}
                control={control}
                register={register}
                setValue={setValue}
                trigger={trigger}
                open={activeItemIndex === itemIndex}
                onOpenChange={(nextOpen) => { setActiveItemIndex(nextOpen ? itemIndex : null); }}
                canMoveUp={itemIndex > 0 && module.itens[itemIndex - 1]?.tipo !== 'video'}
                canMoveDown={field.tipo !== 'video' && itemIndex < itemsArray.fields.length - 1}
                canDelete={itemsArray.fields.length > 1}
                canDuplicate={field.tipo !== 'video'}
                videoTypeAvailable={!module.itens.some((candidate, candidateIndex) => candidateIndex !== itemIndex && candidate.tipo === 'video')}
                onMove={(direction) => { moveItem(itemIndex, direction); }}
                onDuplicate={() => { duplicateItem(itemIndex); }}
                onTypeChange={(type) => { changeItemType(itemIndex, type); }}
                onRequestDelete={() => { setDeleteItemIndex(itemIndex); }}
                onDragStart={(event) => { event.dataTransfer.setData('application/x-pdc-course-item', `${String(moduleIndex)}:${String(itemIndex)}`); }}
                onDrop={(event) => { dropItem(event, itemIndex); }}
              />
            ))}
          </div>

          <div className="rounded-lg border border-dashed border-border bg-recessed/30 p-4 text-center">
            <Button type="button" variant="outline" size="sm" onClick={() => { setPickerOpen(true); }} className="gap-2"><Plus size={15} /> Adicionar aula</Button>
            <p className="mt-2 text-xs text-ink-tertiary">A nova aula será adicionada no fim e aberta para edição.</p>
          </div>

          {itemsArray.fields.length === 1 ? <p className="text-xs text-ink-tertiary">Cada módulo precisa de pelo menos uma aula.</p> : null}
        </div>
      ) : null}

      <CourseContentTypePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={addItem}
        videoAvailable={!module.itens.some((item) => item.tipo === 'video')}
      />
      <CourseDeleteDialog
        open={deleteItemIndex !== null}
        title="Eliminar esta aula?"
        description="A aula e todo o seu conteúdo serão removidos deste rascunho. Esta ação só será persistida quando guardares o curso."
        confirmLabel="Eliminar aula"
        onCancel={() => { setDeleteItemIndex(null); }}
        onConfirm={() => {
          if (deleteItemIndex !== null) {
            replaceItems(module.itens.filter((_, index) => index !== deleteItemIndex));
          }
          setActiveItemIndex(null);
          setDeleteItemIndex(null);
        }}
      />
    </article>
  );
}

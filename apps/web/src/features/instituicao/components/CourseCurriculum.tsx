import { useEffect, useState, type DragEvent } from 'react';
import { useWatch, type Control, type UseFieldArrayReturn, type UseFormRegister, type UseFormSetValue, type UseFormTrigger } from 'react-hook-form';
import type { CriarCursoPayload } from '@pdc/shared';
import { Layers, Plus } from 'lucide-react';
import { Button } from '@/components/ui';
import { CourseDeleteDialog } from './course-studio/CourseDeleteDialog';
import { CourseModuleCard } from './course-studio/CourseModuleCard';
import { createCourseItem, duplicateCourseModule } from './course-studio/course-curriculum';

interface CourseCurriculumProps {
  register: UseFormRegister<CriarCursoPayload>;
  control: Control<CriarCursoPayload>;
  setValue: UseFormSetValue<CriarCursoPayload>;
  trigger: UseFormTrigger<CriarCursoPayload>;
  modulosArray: UseFieldArrayReturn<CriarCursoPayload, 'modulos'>;
}

export function CourseCurriculum({
  register,
  control,
  setValue,
  trigger,
  modulosArray,
}: CourseCurriculumProps): React.JSX.Element {
  const [deleteModuleIndex, setDeleteModuleIndex] = useState<number | null>(null);
  const [newModuleIndex, setNewModuleIndex] = useState<number | null>(null);
  const modules = useWatch({ control, name: 'modulos' }) ?? [];
  const lessonCount = modules.reduce(
    (total, module) => total + (module.itens?.length ?? 0),
    0,
  );

  useEffect(() => {
    if (newModuleIndex === null) return;
    document.getElementById(`course-module-${String(newModuleIndex)}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setNewModuleIndex(null);
  }, [modulosArray.fields.length, newModuleIndex]);

  const replaceModules = (nextModules: typeof modules) => {
    modulosArray.replace(nextModules.map((module, index) => ({ ...module, ordem: index + 1 })));
  };

  const moveModuleTo = (sourceIndex: number, targetIndex: number) => {
    if (
      sourceIndex === targetIndex
      || sourceIndex < 0
      || targetIndex < 0
      || sourceIndex >= modules.length
      || targetIndex >= modules.length
    ) return;
    modulosArray.move(sourceIndex, targetIndex);
    modules.forEach((_, index) => {
      setValue(`modulos.${index}.ordem`, index + 1, { shouldDirty: true });
    });
  };

  const moveModule = (moduleIndex: number, direction: -1 | 1) => {
    moveModuleTo(moduleIndex, moduleIndex + direction);
  };

  const duplicateModule = (moduleIndex: number) => {
    const source = modules[moduleIndex];
    if (!source) return;
    const next = [...modules];
    next.splice(moduleIndex + 1, 0, duplicateCourseModule(source, moduleIndex + 2));
    replaceModules(next);
  };

  const addModule = () => {
    setNewModuleIndex(modules.length);
    modulosArray.append({
      titulo: `Módulo ${String(modules.length + 1)}`,
      ordem: modules.length + 1,
      itens: [createCourseItem('texto', 1)],
    });
  };

  const dropModule = (event: DragEvent<HTMLElement>, targetIndex: number) => {
    event.preventDefault();
    const sourceValue = event.dataTransfer.getData('application/x-pdc-course-module');
    if (sourceValue === '') return;
    const sourceIndex = Number(sourceValue);
    if (!Number.isInteger(sourceIndex)) return;
    moveModuleTo(sourceIndex, targetIndex);
  };

  return (
    <section className="space-y-7">
      <div>
        <h3 className="flex items-center gap-2 text-base font-bold text-ink-primary">
          <Layers size={19} className="text-accent" aria-hidden="true" /> Estrutura do curso
        </h3>
        <p className="mt-2 text-sm leading-6 text-ink-secondary">
          {modules.length} {modules.length === 1 ? 'módulo' : 'módulos'} ·{' '}
          {lessonCount} {lessonCount === 1 ? 'aula' : 'aulas'}
        </p>
      </div>

      <div className="space-y-4">
        {modulosArray.fields.map((field, moduleIndex) => (
          <CourseModuleCard
            key={field.id}
            moduleIndex={moduleIndex}
            totalModules={modulosArray.fields.length}
            control={control}
            register={register}
            setValue={setValue}
            trigger={trigger}
            onMove={(direction) => { moveModule(moduleIndex, direction); }}
            onDuplicate={() => { duplicateModule(moduleIndex); }}
            onRequestDelete={() => { setDeleteModuleIndex(moduleIndex); }}
            onDragStart={(event) => { event.dataTransfer.setData('application/x-pdc-course-module', String(moduleIndex)); }}
            onDrop={(event) => { dropModule(event, moduleIndex); }}
            initiallyOpen={newModuleIndex === moduleIndex}
          />
        ))}
      </div>

      <div className="rounded-lg border border-dashed border-border bg-recessed/30 p-4 text-center">
        <Button type="button" variant="outline" size="sm" onClick={addModule} className="gap-2">
          <Plus size={15} aria-hidden="true" /> Adicionar módulo
        </Button>
        <p className="mt-2 text-xs text-ink-tertiary">O novo módulo será aberto aqui, pronto para editar.</p>
      </div>

      <CourseDeleteDialog
        open={deleteModuleIndex !== null}
        title="Eliminar este módulo?"
        description="Todas as aulas dentro do módulo serão removidas deste rascunho. Esta ação só será persistida quando guardares o curso."
        confirmLabel="Eliminar módulo"
        onCancel={() => { setDeleteModuleIndex(null); }}
        onConfirm={() => {
          if (deleteModuleIndex !== null && modules.length > 1) {
            replaceModules(modules.filter((_, index) => index !== deleteModuleIndex));
          }
          setDeleteModuleIndex(null);
        }}
      />
    </section>
  );
}

import { useWatch, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form';
import { Input } from '@/components/ui';
import {
  AreaVocacionalSchema,
  CursoNivelSchema,
  CURSO_DESCRICAO_MAX_LENGTH,
  type CriarCursoPayload,
} from '@pdc/shared';
import { COURSE_AREA_LABELS, COURSE_LEVEL_LABELS } from './course-localization';

interface Props {
  control: Control<CriarCursoPayload>;
  register: UseFormRegister<CriarCursoPayload>;
  errors: FieldErrors<CriarCursoPayload>;
}

const COURSE_NUMBER_FORMATTER = new Intl.NumberFormat('pt-AO');

export function CourseBaseInfo({ control, register, errors }: Props) {
  const title = useWatch({ control, name: 'titulo' });
  const description = useWatch({ control, name: 'descricao' });
  const descriptionLength = description?.length ?? 0;
  const formattedDescriptionLength = COURSE_NUMBER_FORMATTER.format(descriptionLength);
  const formattedDescriptionLimit = COURSE_NUMBER_FORMATTER.format(CURSO_DESCRICAO_MAX_LENGTH);

  return (
    <div className="space-y-7">
      <div className="max-w-3xl">
        <Input
          id="course-title"
          label="Título do curso"
          {...register('titulo')}
          error={errors.titulo?.message}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <div className="space-y-2">
          <label
            htmlFor="course-description"
            className="text-ink-secondary block text-sm font-medium"
          >
            Descrição do curso
          </label>
          <span
            id="course-description-guidance"
            className="text-ink-tertiary block max-w-2xl text-xs leading-5"
          >
            Começa por uma síntese curta e apelativa. As primeiras linhas aparecem no catálogo; o
            texto completo aparece na página do curso.
          </span>
          <textarea
            id="course-description"
            aria-invalid={errors.descricao ? true : undefined}
            aria-describedby="course-description-guidance course-description-help course-description-count"
            className="border-border bg-canvas text-ink-primary placeholder:text-ink-tertiary/70 focus:border-accent flex min-h-52 w-full rounded-sm border px-4 py-3 text-sm leading-6 transition-colors outline-none"
            placeholder={
              'Ex.: Aprende a criar aplicações web modernas, mesmo sem experiência prévia.\n\nAo longo do curso vais desenvolver um projeto completo, praticar os conceitos essenciais e receber orientações para continuares a evoluir.'
            }
            {...register('descricao')}
          />
          <span className="flex min-h-5 items-start justify-between gap-3">
            {errors.descricao ? (
              <span id="course-description-help" className="text-error text-xs">
                {errors.descricao.message}
              </span>
            ) : (
              <span id="course-description-help" className="text-ink-tertiary text-xs">
                Entre 10 e {formattedDescriptionLimit} caracteres.
              </span>
            )}
            <span
              id="course-description-count"
              className="text-ink-tertiary shrink-0 text-xs tabular-nums"
            >
              {formattedDescriptionLength}/{formattedDescriptionLimit}
            </span>
          </span>
        </div>

        <aside
          className="border-border bg-canvas overflow-hidden rounded-lg border"
          aria-label="Pré-visualização da descrição no catálogo"
        >
          <div className="border-border bg-recessed border-b px-4 py-3">
            <p className="text-accent text-[10px] font-bold tracking-wider uppercase">
              Pré-visualização no catálogo
            </p>
          </div>
          <div className="space-y-2 p-4">
            <p className="text-ink-primary line-clamp-2 text-sm font-semibold">
              {title?.trim() || 'Título do curso'}
            </p>
            <p className="text-ink-secondary line-clamp-3 text-xs leading-5">
              {description?.trim() ||
                'As primeiras linhas da descrição aparecerão aqui para ajudar o estudante a decidir se quer abrir o curso.'}
            </p>
          </div>
          <div className="border-border border-t px-4 py-3">
            <p className="text-ink-tertiary text-xs leading-5">
              Na página do curso, esta descrição é apresentada completa em “Descrição do percurso”.
            </p>
          </div>
        </aside>
      </div>

      <div className="max-w-3xl">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="course-area" className="text-ink-secondary text-sm font-medium">
              Área vocacional
            </label>
            <select
              id="course-area"
              {...register('area')}
              className="border-border bg-canvas text-ink-primary focus:border-accent min-h-11 w-full rounded-sm border px-4 text-sm outline-none"
            >
              {AreaVocacionalSchema.options.map((opt) => (
                <option key={opt} value={opt}>
                  {COURSE_AREA_LABELS[opt] ?? opt}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="course-level" className="text-ink-secondary text-sm font-medium">
              Nível
            </label>
            <select
              id="course-level"
              {...register('nivel')}
              className="border-border bg-canvas text-ink-primary focus:border-accent min-h-11 w-full rounded-sm border px-4 text-sm outline-none"
            >
              {CursoNivelSchema.options.map((value) => (
                <option key={value} value={value}>
                  {COURSE_LEVEL_LABELS[value] ?? value}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

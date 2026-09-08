import { useWatch, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form';
import { Input } from '@/components/ui';
import { AreaVocacionalSchema, CURSO_DESCRICAO_MAX_LENGTH, type CriarCursoPayload } from '@pdc/shared';

interface Props {
  control: Control<CriarCursoPayload>;
  register: UseFormRegister<CriarCursoPayload>;
  errors: FieldErrors<CriarCursoPayload>;
}

const AREA_LABELS: Record<string, string> = {
  SAUDE: 'Saúde',
  ENGENHARIA: 'Engenharia',
  TECNOLOGIA: 'Tecnologia',
  DIREITO: 'Direito',
  GESTAO: 'Gestão',
  EDUCACAO: 'Educação',
  ARTES: 'Artes',
  CIENCIAS_AGRARIAS: 'Ciências Agrárias',
  CIENCIAS_SOCIAIS: 'Ciências Sociais',
  COMUNICACAO: 'Comunicação',
  CIENCIAS_NATURAIS: 'Ciências Naturais',
  ARQUITETURA: 'Arquitetura',
  TURISMO_HOTELARIA: 'Turismo e Hotelaria',
  DESPORTO: 'Desporto',
  OUTRA: 'Outra',
};
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
        <Input id="course-title" label="Título do curso" {...register('titulo')} error={errors.titulo?.message} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <div className="space-y-2">
          <label htmlFor="course-description" className="block text-sm font-medium text-ink-secondary">Descrição do curso</label>
          <span className="block max-w-2xl text-xs leading-5 text-ink-tertiary">
            Começa por uma síntese curta e apelativa. As primeiras linhas aparecem no catálogo; o texto completo aparece na página do curso.
          </span>
          <textarea
            id="course-description"
            aria-invalid={errors.descricao ? true : undefined}
            aria-describedby="course-description-help course-description-count"
            className="flex min-h-52 w-full rounded-sm border border-border bg-canvas px-4 py-3 text-sm leading-6 text-ink-primary outline-none transition-colors placeholder:text-ink-tertiary/70 focus:border-accent"
            placeholder={'Ex.: Aprende a criar aplicações web modernas, mesmo sem experiência prévia.\n\nAo longo do curso vais desenvolver um projeto completo, praticar os conceitos essenciais e receber orientações para continuares a evoluir.'}
            {...register('descricao')}
          />
          <span className="flex min-h-5 items-start justify-between gap-3">
            {errors.descricao
              ? <span id="course-description-help" className="text-xs text-error">{errors.descricao.message}</span>
              : <span id="course-description-help" className="text-xs text-ink-tertiary">Entre 10 e {formattedDescriptionLimit} caracteres.</span>}
            <span id="course-description-count" className="shrink-0 text-xs tabular-nums text-ink-tertiary">{formattedDescriptionLength}/{formattedDescriptionLimit}</span>
          </span>
        </div>

        <aside className="overflow-hidden rounded-lg border border-border bg-canvas" aria-label="Pré-visualização da descrição no catálogo">
          <div className="border-b border-border bg-recessed px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-accent">Pré-visualização no catálogo</p>
          </div>
          <div className="space-y-2 p-4">
            <p className="line-clamp-2 text-sm font-semibold text-ink-primary">
              {title?.trim() || 'Título do curso'}
            </p>
            <p className="line-clamp-3 text-xs leading-5 text-ink-secondary">
              {description?.trim() || 'As primeiras linhas da descrição aparecerão aqui para ajudar o estudante a decidir se quer abrir o curso.'}
            </p>
          </div>
          <div className="border-t border-border px-4 py-3">
            <p className="text-xs leading-5 text-ink-tertiary">
              Na página do curso, esta descrição é apresentada completa em “Descrição do percurso”.
            </p>
          </div>
        </aside>
      </div>

      <div className="max-w-3xl">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="course-area" className="text-sm font-medium text-ink-secondary">Área vocacional</label>
            <select id="course-area" {...register('area')} className="min-h-11 w-full rounded-sm border border-border bg-canvas px-4 text-sm text-ink-primary outline-none focus:border-accent">
              {AreaVocacionalSchema.options.map((opt) => <option key={opt} value={opt}>{AREA_LABELS[opt] ?? opt}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="course-level" className="text-sm font-medium text-ink-secondary">Nível</label>
            <select id="course-level" {...register('nivel')} className="min-h-11 w-full rounded-sm border border-border bg-canvas px-4 text-sm text-ink-primary outline-none focus:border-accent">
              <option value="basico">Básico</option>
              <option value="medio">Intermédio</option>
              <option value="avancado">Avançado</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

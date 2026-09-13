import { Check, ChevronRight, CircleAlert, FileText, Layers3, Send } from 'lucide-react';
import {
  CursoReadinessStepSchema,
  type CursoReadinessResult,
  type CursoReadinessStep,
  type CriarCursoPayload,
} from '@pdc/shared';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';
import { COURSE_AREA_LABELS, COURSE_LEVEL_LABELS } from './course-localization';

interface CourseReviewPanelProps {
  values: Pick<CriarCursoPayload, 'titulo' | 'area' | 'nivel' | 'modulos'>;
  readiness: CursoReadinessResult;
  onResolve: (step: CursoReadinessStep) => void;
  submitLabel?: string;
  onSubmit?: () => void;
  submitDisabled?: boolean;
}

interface CheckItemProps {
  complete: boolean;
  label: string;
  detail: string;
  onResolve?: () => void;
}

const CHECK_COPY: Record<CursoReadinessStep, { label: string; okDetail: string }> = {
  info: { label: 'Informação básica', okDetail: 'Título, descrição e capa estão prontos.' },
  curriculum: { label: 'Currículo', okDetail: 'Todos os módulos têm aulas com conteúdo real.' },
  merit: {
    label: 'Acesso e preço',
    okDetail: 'Visibilidade e modalidade de acesso estão coerentes.',
  },
};

function CheckItem({ complete, label, detail, onResolve }: CheckItemProps): React.JSX.Element {
  return (
    <li className="border-border flex items-start gap-3 border-b py-4 last:border-b-0">
      <span
        className={cn(
          'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
          complete
            ? 'bg-[var(--accent-success)] text-white'
            : 'bg-[var(--accent-warning)]/15 text-[var(--accent-warning)]'
        )}
      >
        {complete ? (
          <Check size={14} aria-hidden="true" />
        ) : (
          <CircleAlert size={14} aria-hidden="true" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-ink-primary block text-sm font-bold">{label}</span>
        <span className="text-ink-tertiary mt-0.5 block text-xs leading-5">{detail}</span>
      </span>
      {!complete && onResolve ? (
        <button
          type="button"
          onClick={onResolve}
          aria-label={`Corrigir: ${label}`}
          className="text-accent inline-flex min-h-9 shrink-0 items-center gap-1 text-xs font-bold hover:underline"
        >
          Corrigir <ChevronRight size={14} aria-hidden="true" />
        </button>
      ) : null}
    </li>
  );
}

export function CourseReviewPanel({
  values,
  readiness,
  onResolve,
  submitLabel,
  onSubmit,
  submitDisabled,
}: CourseReviewPanelProps): React.JSX.Element {
  const modules = values.modulos ?? [];
  const itemCount = modules.reduce((total, module) => total + (module?.itens?.length ?? 0), 0);
  const checks = CursoReadinessStepSchema.options.map((step) => ({
    id: step,
    result: readiness.byStep[step],
    copy: CHECK_COPY[step],
  }));
  const completedChecks = checks.filter(({ result }) => result.complete).length;
  const totalChecks = checks.length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <article className="bg-canvas rounded-lg border border-[var(--chrome-border)] p-5">
          <FileText size={20} className="text-accent" aria-hidden="true" />
          <p className="text-ink-tertiary mt-4 text-xs font-bold tracking-wider uppercase">Curso</p>
          <p className="text-ink-primary mt-1 line-clamp-2 text-lg font-bold">
            {values.titulo?.trim() || 'Curso sem título'}
          </p>
          <p className="text-ink-secondary mt-2 text-xs">
            {values.area ? (COURSE_AREA_LABELS[values.area] ?? values.area) : 'Área por definir'} ·{' '}
            {values.nivel
              ? (COURSE_LEVEL_LABELS[values.nivel] ?? values.nivel)
              : 'Nível por definir'}
          </p>
        </article>

        <article className="bg-canvas rounded-lg border border-[var(--chrome-border)] p-5">
          <Layers3 size={20} className="text-accent" aria-hidden="true" />
          <p className="text-ink-tertiary mt-4 text-xs font-bold tracking-wider uppercase">
            Estrutura
          </p>
          <p className="text-ink-primary mt-1 text-lg font-bold">
            {modules.length} {modules.length === 1 ? 'módulo' : 'módulos'}
          </p>
          <p className="text-ink-secondary mt-2 text-xs">
            {itemCount} {itemCount === 1 ? 'aula preparada' : 'aulas preparadas'}
          </p>
        </article>
      </div>

      <div className="bg-canvas rounded-lg border border-[var(--chrome-border)] px-5">
        <div className="border-border flex items-center justify-between gap-4 border-b py-5">
          <div>
            <h3 className="text-ink-primary text-base font-bold">Prontidão para revisão</h3>
            <p className="text-ink-tertiary mt-1 text-xs">
              Verificações essenciais deste rascunho.
            </p>
          </div>
          <span
            className="bg-recessed text-ink-secondary rounded-full px-3 py-1 text-xs font-bold"
            aria-label={`${String(completedChecks)} de ${String(totalChecks)} verificações concluídas`}
          >
            {completedChecks}/{totalChecks}
          </span>
        </div>
        <ul>
          {checks.map(({ id, result, copy }) => (
            <CheckItem
              key={id}
              complete={result.complete}
              label={copy.label}
              detail={result.issues[0]?.message ?? copy.okDetail}
              onResolve={() => {
                onResolve(id);
              }}
            />
          ))}
        </ul>
      </div>
      {submitLabel && onSubmit ? (
        <div className="border-border flex justify-end border-t pt-6">
          <Button type="button" disabled={submitDisabled} onClick={onSubmit} className="gap-2">
            <Send size={15} aria-hidden="true" /> {submitLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

import { Check, CircleAlert, FileText, Layers3 } from 'lucide-react';
import { useWatch, type Control, type FieldErrors } from 'react-hook-form';
import type { CriarCursoPayload } from '@pdc/shared';
import { cn } from '@/lib/utils';

interface CourseReviewPanelProps {
  control: Control<CriarCursoPayload>;
  errors: FieldErrors<CriarCursoPayload>;
}

interface CheckItemProps {
  complete: boolean;
  label: string;
  detail: string;
}

function CheckItem({ complete, label, detail }: CheckItemProps): React.JSX.Element {
  return (
    <li className="flex items-start gap-3 border-b border-border py-4 last:border-b-0">
      <span className={cn(
        'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
        complete
          ? 'bg-[var(--accent-success)] text-white'
          : 'bg-[var(--accent-warning)]/15 text-[var(--accent-warning)]',
      )}>
        {complete ? <Check size={14} aria-hidden="true" /> : <CircleAlert size={14} aria-hidden="true" />}
      </span>
      <span>
        <span className="block text-sm font-bold text-ink-primary">{label}</span>
        <span className="mt-0.5 block text-xs leading-5 text-ink-tertiary">{detail}</span>
      </span>
    </li>
  );
}

export function CourseReviewPanel({ control, errors }: CourseReviewPanelProps): React.JSX.Element {
  const values = useWatch({ control });
  const modules = values.modulos ?? [];
  const itemCount = modules.reduce((total, module) => total + (module?.itens?.length ?? 0), 0);
  const identityComplete = Boolean(values.titulo?.trim() && values.descricao?.trim());
  const curriculumComplete = modules.length > 0 && itemCount > 0;
  const pricingComplete = values.gratuito === true || Number(values.preco) > 0;
  const hasValidationErrors = Object.keys(errors).length > 0;
  const completedChecks = [identityComplete, curriculumComplete, pricingComplete, !hasValidationErrors]
    .filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-lg border border-[var(--chrome-border)] bg-canvas p-5">
          <FileText size={20} className="text-accent" aria-hidden="true" />
          <p className="mt-4 text-xs font-bold uppercase tracking-wider text-ink-tertiary">Curso</p>
          <p className="mt-1 line-clamp-2 text-lg font-bold text-ink-primary">
            {values.titulo?.trim() || 'Curso sem título'}
          </p>
          <p className="mt-2 text-xs text-ink-secondary">
            {values.area ?? 'Área por definir'} · {values.nivel ?? 'Nível por definir'}
          </p>
        </article>

        <article className="rounded-lg border border-[var(--chrome-border)] bg-canvas p-5">
          <Layers3 size={20} className="text-accent" aria-hidden="true" />
          <p className="mt-4 text-xs font-bold uppercase tracking-wider text-ink-tertiary">Estrutura</p>
          <p className="mt-1 text-lg font-bold text-ink-primary">
            {modules.length} {modules.length === 1 ? 'módulo' : 'módulos'}
          </p>
          <p className="mt-2 text-xs text-ink-secondary">
            {itemCount} {itemCount === 1 ? 'conteúdo preparado' : 'conteúdos preparados'}
          </p>
        </article>
      </div>

      <div className="rounded-lg border border-[var(--chrome-border)] bg-canvas px-5">
        <div className="flex items-center justify-between gap-4 border-b border-border py-5">
          <div>
            <h3 className="text-base font-bold text-ink-primary">Prontidão para revisão</h3>
            <p className="mt-1 text-xs text-ink-tertiary">Verificações essenciais deste rascunho.</p>
          </div>
          <span className="rounded-full bg-recessed px-3 py-1 text-xs font-bold text-ink-secondary">
            {completedChecks}/4
          </span>
        </div>
        <ul>
          <CheckItem complete={identityComplete} label="Informação básica" detail="Título e descrição identificam claramente o curso." />
          <CheckItem complete={curriculumComplete} label="Currículo" detail="Existe pelo menos um módulo com conteúdo." />
          <CheckItem complete={pricingComplete} label="Acesso e preço" detail="A modalidade gratuita ou o preço estão coerentes." />
          <CheckItem complete={!hasValidationErrors} label="Validação" detail="O formulário não apresenta campos inválidos conhecidos." />
        </ul>
      </div>
    </div>
  );
}

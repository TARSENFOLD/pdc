import { Check, CircleAlert } from 'lucide-react';
import type { CursoReadinessResult, CursoReadinessStep } from '@pdc/shared';

interface CourseStepReadinessProps {
  step: CursoReadinessStep;
  readiness: CursoReadinessResult;
}

export function CourseStepReadiness({ step, readiness }: CourseStepReadinessProps): React.JSX.Element {
  const result = readiness.byStep[step];

  if (result.complete) {
    return (
      <div className="mt-8 flex items-center gap-2 rounded-lg border border-[var(--accent-success)]/25 bg-[var(--accent-success)]/10 px-4 py-3 text-sm font-semibold text-ink-primary">
        <Check size={17} className="text-[var(--accent-success)]" aria-hidden="true" />
        Etapa concluída. Podes avançar.
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-lg border border-[var(--accent-warning)]/30 bg-[var(--accent-warning)]/10 p-4">
      <p className="flex items-center gap-2 text-sm font-bold text-ink-primary">
        <CircleAlert size={17} className="text-[var(--accent-warning)]" aria-hidden="true" />
        Para concluir esta etapa
      </p>
      <ul className="mt-3 space-y-2 pl-6 text-xs leading-5 text-ink-secondary">
        {result.issues.map((issue) => <li key={`${issue.path}-${issue.message}`} className="list-disc">{issue.message}</li>)}
      </ul>
    </div>
  );
}

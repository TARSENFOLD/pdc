import type { CursoReadinessResult, CursoReadinessStep } from '@pdc/shared';

interface BuilderStepIdentity {
  id: string;
}

interface FindBlockingStepOptions {
  activeStep: string;
  targetStep: string;
  steps: readonly BuilderStepIdentity[];
  readinessSteps: readonly CursoReadinessStep[];
  readiness: CursoReadinessResult;
}

export function findBlockingReadinessStep({
  activeStep,
  targetStep,
  steps,
  readinessSteps,
  readiness,
}: FindBlockingStepOptions): CursoReadinessStep | undefined {
  const activeIndex = steps.findIndex((step) => step.id === activeStep);
  const targetIndex = steps.findIndex((step) => step.id === targetStep);
  if (targetIndex < 0 || targetIndex <= activeIndex) return undefined;

  return readinessSteps.find((step) => {
    const stepIndex = steps.findIndex((candidate) => candidate.id === step);
    return stepIndex < targetIndex && !readiness.byStep[step].complete;
  });
}

export function cumulativeCompletedReadinessSteps(
  readinessSteps: readonly CursoReadinessStep[],
  readiness: CursoReadinessResult,
): CursoReadinessStep[] {
  return readinessSteps.filter((_, index) => (
    readinessSteps.slice(0, index + 1).every((step) => readiness.byStep[step].complete)
  ));
}

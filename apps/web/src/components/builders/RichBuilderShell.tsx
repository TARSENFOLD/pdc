import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useFocusHeader } from '@/components/layout/useFocusHeader';
import { BuilderStepContext } from './builder-step-context';
import BuilderTopStepper from './BuilderTopStepper';

export interface RichBuilderStep {
  id: string;
  label: string;
  description?: string;
}

export interface RichBuilderShellProps {
  title: string;
  backTo?: string;
  steps: RichBuilderStep[];
  children: ReactNode;
  settingsPanel: ReactNode;
  actions?: ReactNode;
  activeStep?: string;
  onStepChange?: (stepId: string) => void;
  completedSteps?: readonly string[];
}

export default function RichBuilderShell({
  title,
  backTo,
  steps,
  children,
  settingsPanel,
  actions,
  activeStep: controlledStep,
  onStepChange,
  completedSteps,
}: RichBuilderShellProps): React.JSX.Element {
  const [internalStep, setInternalStep] = useState(steps[0]?.id ?? null);
  useEffect(() => {
    if (controlledStep !== undefined) return;
    const internalStepValid = steps.some((step) => step.id === internalStep);
    if (!internalStepValid) setInternalStep(steps[0]?.id ?? null);
  }, [controlledStep, internalStep, steps]);
  const requestedStep = controlledStep ?? internalStep;
  const activeStep = steps.some((step) => step.id === requestedStep)
    ? requestedStep
    : (steps[0]?.id ?? null);
  const activeIndex = steps.findIndex((step) => step.id === activeStep);
  const hasSteps = steps.length > 0;

  const selectStep = useCallback((stepId: string) => {
    if (controlledStep === undefined) setInternalStep(stepId);
    onStepChange?.(stepId);
  }, [controlledStep, onStepChange]);

  const previousStep = activeIndex > 0 ? steps[activeIndex - 1] : undefined;
  const nextStep = activeIndex >= 0 && activeIndex < steps.length - 1
    ? steps[activeIndex + 1]
    : undefined;

  const focusHeader = useMemo(() => ({
    title,
    ...(backTo ? { backTo } : {}),
    ...(hasSteps ? {
      progress: (
        <BuilderTopStepper
          steps={steps}
          activeStep={activeStep}
          onStepChange={selectStep}
          {...(completedSteps ? { completedSteps } : {})}
        />
      ),
    } : {}),
    ...(actions ? { actions } : {}),
  }), [actions, activeStep, backTo, completedSteps, hasSteps, selectStep, steps, title]);
  useFocusHeader(focusHeader);

  return (
    <div className="mx-auto max-w-[1480px] pb-24">
      <section className="overflow-hidden rounded-xl border border-[var(--chrome-border)] bg-elevated shadow-[var(--elevation-2)]">
        <div className="grid min-h-[620px] grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px]">
          <main className="min-w-0 bg-elevated px-5 py-8 sm:px-8 lg:px-10">
            <div className="mx-auto max-w-4xl">
              <BuilderStepContext.Provider value={{ activeSection: activeStep }}>
                {children}
              </BuilderStepContext.Provider>

              {hasSteps ? (
                <footer className="mt-12 flex items-center justify-between gap-4 border-t border-border pt-6">
                  <button
                    type="button"
                    disabled={!previousStep}
                    onClick={() => { if (previousStep) selectStep(previousStep.id); }}
                    className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-xs font-bold uppercase tracking-wider text-ink-secondary transition-colors hover:bg-recessed hover:text-ink-primary disabled:pointer-events-none disabled:opacity-30"
                  >
                    <ChevronLeft size={17} aria-hidden="true" />
                    Anterior
                  </button>
                  <span className="hidden text-xs text-ink-tertiary sm:block">
                    {steps[activeIndex]?.label}
                  </span>
                  <button
                    type="button"
                    disabled={!nextStep}
                    onClick={() => { if (nextStep) selectStep(nextStep.id); }}
                    className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[var(--chrome-active)] px-5 text-xs font-bold uppercase tracking-wider text-[var(--surface-canvas)] transition-colors hover:opacity-90 disabled:pointer-events-none disabled:opacity-30"
                  >
                    Seguinte
                    <ChevronRight size={17} aria-hidden="true" />
                  </button>
                </footer>
              ) : null}
            </div>
          </main>
          <aside className="border-t border-[var(--chrome-border)] bg-recessed/55 p-5 lg:border-l lg:border-t-0 lg:p-6">
            <div className="lg:sticky lg:top-5">{settingsPanel}</div>
          </aside>
        </div>
      </section>
    </div>
  );
}

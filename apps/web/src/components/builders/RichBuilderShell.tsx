import { Check } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { BuilderStepContext } from './builder-step-context';

export interface RichBuilderStep {
  id: string;
  label: string;
  description?: string;
}

export interface RichBuilderShellProps {
  title: string;
  description?: string;
  steps: RichBuilderStep[];
  children: ReactNode;
  settingsPanel: ReactNode;
  actions?: ReactNode;
  activeStep?: string;
  onStepChange?: (stepId: string) => void;
}

export default function RichBuilderShell({
  title,
  description,
  steps,
  children,
  settingsPanel,
  actions,
  activeStep: controlledStep,
  onStepChange,
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

  const selectStep = (stepId: string) => {
    if (controlledStep === undefined) setInternalStep(stepId);
    onStepChange?.(stepId);
  };

  return (
    <div className="mx-auto max-w-[1600px] pb-28">
      <div className="border-b border-border px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <h2 className="font-display text-3xl text-ink-primary">{title}</h2>
            {description && <p className="mt-2 text-sm leading-6 text-ink-secondary">{description}</p>}
          </div>
          {actions}
        </div>

        {hasSteps && <nav className="mt-6 overflow-x-auto" aria-label="Etapas de criação">
          <ol className="flex min-w-max items-start gap-2">
            {steps.map((step, index) => {
              const isActive = step.id === activeStep;
              const isComplete = activeIndex > index;
              return (
                <li key={step.id} className="w-48">
                  <button
                    type="button"
                    onClick={() => { selectStep(step.id); }}
                    className={cn(
                      'flex min-h-11 w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                      isActive ? 'bg-accent/10 text-accent' : 'text-ink-secondary hover:bg-recessed hover:text-ink-primary',
                    )}
                    aria-current={isActive ? 'step' : undefined}
                  >
                    <span className={cn(
                      'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                      isActive || isComplete ? 'border-accent bg-accent text-ink-on-accent' : 'border-border text-ink-tertiary',
                    )}>
                      {isComplete ? <Check size={13} /> : index + 1}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{step.label}</span>
                      {step.description && <span className="mt-0.5 block text-xs text-ink-tertiary">{step.description}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px]">
        <main className="min-w-0 px-4 py-8 sm:px-6 lg:px-10">
          <BuilderStepContext.Provider value={{ activeSection: activeStep }}>
            {children}
          </BuilderStepContext.Provider>
        </main>
        <aside className="border-t border-border bg-recessed/30 p-4 lg:border-l lg:border-t-0 lg:p-6">
          {settingsPanel}
        </aside>
      </div>
    </div>
  );
}

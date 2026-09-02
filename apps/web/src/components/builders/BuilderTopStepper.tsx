import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RichBuilderStep } from './RichBuilderShell';

interface BuilderTopStepperProps {
  steps: RichBuilderStep[];
  activeStep: string | null;
  onStepChange: (stepId: string) => void;
}

export default function BuilderTopStepper({
  steps,
  activeStep,
  onStepChange,
}: BuilderTopStepperProps): React.JSX.Element {
  const activeIndex = steps.findIndex((step) => step.id === activeStep);

  return (
    <nav
      className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Etapas de criação"
    >
      <ol className="flex min-w-max items-center">
        {steps.map((step, index) => {
          const isActive = step.id === activeStep;
          const isComplete = activeIndex > index;

          return (
            <li key={step.id} className="flex items-center">
              {index > 0 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    'mx-2 h-px w-5 bg-border transition-colors xl:w-8',
                    isComplete || isActive ? 'bg-accent' : undefined,
                  )}
                />
              ) : null}
              <button
                type="button"
                onClick={() => { onStepChange(step.id); }}
                className={cn(
                  'group inline-flex min-h-11 items-center gap-2 rounded-md px-1.5 text-left text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  isActive ? 'text-ink-primary' : 'text-ink-tertiary hover:text-ink-primary',
                )}
                aria-current={isActive ? 'step' : undefined}
              >
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold transition-colors',
                    isActive
                      ? 'border-accent bg-accent text-ink-on-accent'
                      : isComplete
                        ? 'border-[var(--accent-success)] bg-[var(--accent-success)] text-white'
                        : 'border-border bg-elevated text-ink-tertiary group-hover:border-ink-tertiary',
                  )}
                >
                  {isComplete ? <Check size={13} aria-hidden="true" /> : index + 1}
                </span>
                <span className="whitespace-nowrap">{step.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

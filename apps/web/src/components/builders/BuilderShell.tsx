import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';
import { BuilderStepContext } from './builder-step-context';

interface Breadcrumb {
  label: string;
  to?: string;
}

interface Section {
  id: string;
  label: string;
}

interface BuilderShellProps {
  title: string;
  description: string;
  actions: React.ReactNode;
  children: React.ReactNode;
  form?: unknown;
  breadcrumbs?: Breadcrumb[];
  sections?: Section[];
  state?: string;
}

export default function BuilderShell({
  title,
  description,
  children,
  actions,
  form: _form,
  breadcrumbs,
  state,
  sections,
}: BuilderShellProps): React.ReactElement {
  const [activeSection, setActiveSection] = useState(sections?.[0]?.id ?? null);
  const activeIndex = sections?.findIndex((section) => section.id === activeSection) ?? -1;

  const selectSection = (id: string) => {
    setActiveSection(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="mx-auto max-w-7xl pb-28">
      <header className="border-b border-border px-4 pb-6 pt-4 md:px-6">
        {breadcrumbs && (
          <nav className="mb-5 flex items-center gap-2 text-xs text-ink-tertiary">
            {breadcrumbs.map((breadcrumb, index) => (
              <React.Fragment key={`${breadcrumb.label}-${String(index)}`}>
                {breadcrumb.to ? (
                  <Link to={breadcrumb.to} className="transition-colors hover:text-accent">{breadcrumb.label}</Link>
                ) : (
                  <span>{breadcrumb.label}</span>
                )}
                {index < breadcrumbs.length - 1 && <ChevronRight size={12} />}
              </React.Fragment>
            ))}
          </nav>
        )}

        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl">
            <h1 className="text-2xl font-bold text-ink-primary">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-ink-secondary">{description}</p>
          </div>
          {state && (
            <div className="rounded-sm border border-accent/20 bg-accent/10 px-3 py-1 text-xs font-semibold capitalize text-accent">
              {state}
            </div>
          )}
        </div>
      </header>

      <div className="grid min-h-[620px] grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_280px]">
        {sections && (
          <nav className="border-b border-border p-4 lg:border-b-0 lg:border-r lg:p-6" aria-label="Etapas de criação">
            <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-1">
              {sections.map((section, index) => {
                const isActive = activeSection === section.id;
                const isComplete = activeIndex > index;
                return (
                  <li key={section.id}>
                    <button
                      type="button"
                      onClick={() => { selectSection(section.id); }}
                      className={cn(
                        'flex min-h-12 w-full items-center gap-3 rounded-sm px-3 py-2 text-left text-sm transition-colors',
                        isActive ? 'bg-accent/10 text-accent' : 'text-ink-secondary hover:bg-elevated hover:text-ink-primary',
                      )}
                      aria-current={isActive ? 'step' : undefined}
                    >
                      <span className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                        isActive || isComplete ? 'border-accent bg-accent text-white' : 'border-border text-ink-tertiary',
                      )}>
                        {isComplete ? <Check size={14} /> : index + 1}
                      </span>
                      <span className="line-clamp-2">{section.label}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
        )}

        <main className="min-w-0 px-4 py-8 md:px-8 lg:px-10">
          <BuilderStepContext.Provider value={{ activeSection }}>
            {children}
          </BuilderStepContext.Provider>

          {sections && sections.length > 1 && (
            <div className="mt-10 flex items-center justify-between border-t border-border pt-5">
              <Button
                type="button"
                variant="ghost"
                disabled={activeIndex <= 0}
                onClick={() => {
                  const previous = sections[activeIndex - 1];
                  if (previous) selectSection(previous.id);
                }}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Anterior
              </Button>
              <span className="text-xs text-ink-tertiary">
                Etapa {activeIndex + 1} de {sections.length}
              </span>
              <Button
                type="button"
                variant="secondary"
                disabled={activeIndex >= sections.length - 1}
                onClick={() => {
                  const next = sections[activeIndex + 1];
                  if (next) selectSection(next.id);
                }}
              >
                Seguinte
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </main>

        <aside className="border-t border-border p-4 lg:border-l lg:border-t-0 lg:p-6">
          {actions}
        </aside>
      </div>
    </div>
  );
}

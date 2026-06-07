import React from 'react';
import { useBuilderStep } from './builder-step-context';

interface BuilderSectionProps {
  title: string;
  description: string;
  children: React.ReactNode;
  value?: string; // Identificador técnico (Caixa B - funcionalidade de âncora/navegação)
}

export default function BuilderSection({ title, description, children, value }: BuilderSectionProps): React.ReactElement {
  const { activeSection } = useBuilderStep();
  if (activeSection && value && activeSection !== value) return <></>;

  return (
    <section id={value} className="space-y-7">
      <div className="border-b border-border pb-5">
        <h2 className="text-xl font-bold text-ink-primary">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-ink-secondary">{description}</p>
      </div>
      {children}
    </section>
  );
}

import React from 'react';

interface BuilderSectionProps {
  title: string;
  description: string;
  children: React.ReactNode;
  value?: string; // Identificador técnico (Caixa B - funcionalidade de âncora/navegação)
}

export default function BuilderSection({ title, description, children, value }: BuilderSectionProps): React.ReactElement {
  return (
    <section id={value} className="scroll-mt-28 space-y-6">
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="text-sm text-ink-tertiary">{description}</p>
      </div>
      {children}
    </section>
  );
}

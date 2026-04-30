import React from 'react';

interface BuilderSectionProps {
  title: string;
  description: string;
  children: React.ReactNode;
  value?: string; // Identificador técnico (Caixa B - funcionalidade de âncora/navegação)
}

export default function BuilderSection({ title, description, children }: BuilderSectionProps): React.ReactElement {
  // Nota: O 'value' é utilizado pelo BuilderShell para mapeamento de secções e scroll-spy.
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="text-sm text-ink-tertiary">{description}</p>
      </div>
      {children}
    </section>
  );
}

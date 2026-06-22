import { Sparkles } from 'lucide-react';

interface AiDisclosureProps {
  compact?: boolean;
}

export function AiDisclosure({ compact = false }: AiDisclosureProps): React.JSX.Element {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-accent"
      title="Conteúdo gerado com apoio de IA e sujeito a limites do modelo."
    >
      <Sparkles size={12} />
      {compact ? 'IA' : 'Apoio de IA'}
    </span>
  );
}

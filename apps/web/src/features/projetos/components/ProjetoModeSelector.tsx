import type { UseFormRegister } from 'react-hook-form';
import type { CriarProjetoPayload, ProjetoModo } from '@pdc/shared';
import { Banknote, Eye, GraduationCap, MessageCircle, Users } from 'lucide-react';

const MODES: Array<{
  id: ProjetoModo;
  label: string;
  description: string;
  icon: typeof Eye;
}> = [
  { id: 'exposicao', label: 'Exposição', description: 'Apresenta o pitch sem pedidos ativos.', icon: Eye },
  { id: 'colaboracao', label: 'Colaboração', description: 'Recebe pedidos de pessoas que querem contribuir.', icon: Users },
  { id: 'mentoria', label: 'Mentoria', description: 'Abre o projeto a orientação especializada.', icon: GraduationCap },
  { id: 'financiamento', label: 'Financiamento', description: 'Permite manifestações de interesse institucional.', icon: Banknote },
  { id: 'feedbackComunitario', label: 'Feedback comunitário', description: 'Ativa votos e avaliação da comunidade.', icon: MessageCircle },
];

interface ProjetoModeSelectorProps {
  register: UseFormRegister<CriarProjetoPayload>;
  selected: ProjetoModo[];
  error?: string | undefined;
}

export function ProjetoModeSelector({ register, selected, error }: ProjetoModeSelectorProps): React.JSX.Element {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {MODES.map((mode) => {
          const Icon = mode.icon;
          const active = selected.includes(mode.id);
          return (
            <label
              key={mode.id}
              className={`flex cursor-pointer items-start gap-3 rounded-sm border p-4 transition-colors ${
                active ? 'border-accent/50 bg-accent/10' : 'border-border bg-recessed hover:border-accent/30'
              }`}
            >
              <input type="checkbox" value={mode.id} className="sr-only" {...register('modos')} />
              <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-sm ${active ? 'bg-accent text-white' : 'bg-canvas text-ink-tertiary'}`}>
                <Icon size={17} />
              </span>
              <span>
                <span className="block text-sm font-semibold text-ink-primary">{mode.label}</span>
                <span className="mt-1 block text-xs leading-relaxed text-ink-tertiary">{mode.description}</span>
              </span>
            </label>
          );
        })}
      </div>
      {error && <p className="text-xs text-accent-danger">{error}</p>}
    </div>
  );
}

import type { UseFormRegister, UseFormWatch } from 'react-hook-form';
import type { CriarCursoPayload } from '@pdc/shared';

interface Props {
  register: UseFormRegister<CriarCursoPayload>;
  watch: UseFormWatch<CriarCursoPayload>;
}

export function CourseMeritGuard({ register, watch }: Props) {
  return (
    <div className="max-w-3xl space-y-8">
      <p className="text-sm leading-6 text-ink-secondary">
        Estes valores ajudam a recomendar o curso a estudantes com preparação compatível.
        Mantém tudo em zero quando não quiseres restringir recomendações.
      </p>

      <div className="space-y-9 border-y border-border py-8">
        <div className="space-y-3">
          <div className="flex justify-between text-xs font-semibold text-ink-secondary">
            <span>Fluidez mínima</span>
            <span>{watch('regrasAcesso.minFluidez')}/10</span>
          </div>
          <input type="range" min="0" max="10" step="0.5" {...register('regrasAcesso.minFluidez', { valueAsNumber: true })} className="w-full accent-accent" />
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-xs font-semibold text-ink-secondary">
            <span>Resiliência mínima</span>
            <span>{watch('regrasAcesso.minResiliencia')}/10</span>
          </div>
          <input type="range" min="0" max="10" step="0.5" {...register('regrasAcesso.minResiliencia', { valueAsNumber: true })} className="w-full accent-accent" />
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-xs font-semibold text-ink-secondary">
            <span>Foco mínimo</span>
            <span>{watch('regrasAcesso.minFoco')}/10</span>
          </div>
          <input type="range" min="0" max="10" step="0.5" {...register('regrasAcesso.minFoco', { valueAsNumber: true })} className="w-full accent-accent" />
        </div>
      </div>
    </div>
  );
}

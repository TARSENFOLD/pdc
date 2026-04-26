import { UseFormRegister, UseFormWatch } from 'react-hook-form';
import { Card } from '@/components/ui';
import { Brain } from 'lucide-react';
import type { CriarCursoPayload } from '@pdc/shared';

interface Props {
  register: UseFormRegister<CriarCursoPayload>;
  watch: UseFormWatch<CriarCursoPayload>;
}

export function CourseMeritGuard({ register, watch }: Props) {
  return (
    <Card className="p-8 border-accent/20 bg-accent/5 backdrop-blur-xl relative overflow-hidden h-full">
      <div className="absolute top-0 right-0 p-4 opacity-10"><Brain size={80} /></div>
      
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-accent text-white rounded-lg shadow-lg shadow-accent/20"><Brain size={20} /></div>
        <h2 className="text-xl font-bold">Gardião de Mérito</h2>
      </div>

      <p className="text-xs text-text-secondary mb-8 leading-relaxed">
        Define os requisitos biomecânicos mínimos. O **Match Terminal** apenas sugerirá este curso a estudantes que provem este nível de performance.
      </p>

      <div className="space-y-8">
        <div className="space-y-3">
          <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-accent">
            <span>Min. Fluidez Cognitiva</span>
            <span>{watch('regrasAcesso.minFluidez')}/10</span>
          </div>
          <input type="range" min="0" max="10" step="0.5" {...register('regrasAcesso.minFluidez', { valueAsNumber: true })} className="w-full accent-accent" />
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-accent">
            <span>Min. Resiliência ao Erro</span>
            <span>{watch('regrasAcesso.minResiliencia')}/10</span>
          </div>
          <input type="range" min="0" max="10" step="0.5" {...register('regrasAcesso.minResiliencia', { valueAsNumber: true })} className="w-full accent-accent" />
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-accent">
            <span>Min. Estabilidade de Foco</span>
            <span>{watch('regrasAcesso.minFoco')}/10</span>
          </div>
          <input type="range" min="0" max="10" step="0.5" {...register('regrasAcesso.minFoco', { valueAsNumber: true })} className="w-full accent-accent" />
        </div>
      </div>

      <div className="mt-8 p-4 rounded-xl bg-white/5 border border-white/5 text-[10px] text-text-muted italic">
        Rigor ADR-017: A validação é soberana e automática.
      </div>
    </Card>
  );
}

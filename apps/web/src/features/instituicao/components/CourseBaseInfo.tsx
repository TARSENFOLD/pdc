import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Input } from '@/components/ui';
import { AreaVocacionalSchema, type CriarCursoPayload } from '@pdc/shared';

interface Props {
  register: UseFormRegister<CriarCursoPayload>;
  errors: FieldErrors<CriarCursoPayload>;
}

export function CourseBaseInfo({ register, errors }: Props) {
  return (
    <div className="max-w-3xl space-y-7">
        <Input label="Título do curso" {...register('titulo')} error={errors.titulo?.message} />
        
        <div className="space-y-1">
          <label className="text-sm font-medium text-ink-secondary">Descrição</label>
          <textarea 
            className="flex min-h-36 w-full rounded-sm border border-border bg-canvas px-4 py-3 text-sm text-ink-primary outline-none transition-colors focus:border-accent"
            {...register('descricao')}
          />
          {errors.descricao && <p className="text-xs text-error">{errors.descricao.message}</p>}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
           <div className="space-y-1">
              <label className="text-sm font-medium text-ink-secondary">Área vocacional</label>
              <select {...register('area')} className="min-h-11 w-full rounded-sm border border-border bg-canvas px-4 text-sm text-ink-primary outline-none focus:border-accent">
                {AreaVocacionalSchema.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
           </div>
           <div className="space-y-1">
              <label className="text-sm font-medium text-ink-secondary">Nível</label>
              <select {...register('nivel')} className="min-h-11 w-full rounded-sm border border-border bg-canvas px-4 text-sm text-ink-primary outline-none focus:border-accent">
                <option value="basico">Básico</option>
                <option value="medio">Intermédio</option>
                <option value="avancado">Avançado</option>
              </select>
           </div>
        </div>
    </div>
  );
}

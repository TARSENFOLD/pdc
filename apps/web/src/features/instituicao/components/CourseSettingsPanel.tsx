import type { FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import type { CriarCursoPayload } from '@pdc/shared';
import { Input } from '@/components/ui';
import { SovereignMediaUpload } from './SovereignMediaUpload';

interface CourseSettingsPanelProps {
  register: UseFormRegister<CriarCursoPayload>;
  watch: UseFormWatch<CriarCursoPayload>;
  setValue: UseFormSetValue<CriarCursoPayload>;
  errors: FieldErrors<CriarCursoPayload>;
}

export function CourseSettingsPanel({
  register,
  watch,
  setValue,
  errors,
}: CourseSettingsPanelProps): React.JSX.Element {
  const isFree = watch('gratuito');
  const coverUrl = watch('capaUrl');

  return (
    <div className="space-y-7">
      <div>
        <h3 className="text-sm font-semibold text-ink-primary">Definições do curso</h3>
        <p className="mt-1 text-xs leading-5 text-ink-tertiary">
          Controla a apresentação, o acesso e o preço.
        </p>
      </div>

      <label className="block space-y-2">
        <span className="text-xs font-semibold text-ink-secondary">Visibilidade</span>
        <select
          {...register('visibilidade')}
          className="min-h-11 w-full rounded-sm border border-border bg-canvas px-3 text-sm text-ink-primary outline-none focus:border-accent"
        >
          <option value="publico">Público</option>
          <option value="institucional">Apenas instituição</option>
          <option value="privado">Privado</option>
        </select>
      </label>

      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold text-ink-secondary">Capa</p>
          <p className="mt-1 text-xs text-ink-tertiary">JPG, PNG ou WebP até 5 MB.</p>
        </div>
        {coverUrl && (
          <img src={coverUrl} alt="Pré-visualização da capa" className="aspect-video w-full rounded-sm object-cover" />
        )}
        <SovereignMediaUpload
          onSuccess={(url) => { setValue('capaUrl', url, { shouldDirty: true, shouldValidate: true }); }}
          accept="image/jpeg,image/png,image/webp"
          maxSizeMB={5}
          entityType="curso-capa"
        />
        <input type="hidden" {...register('capaUrl')} />
        {errors.capaUrl?.message && <p className="text-xs text-error">{errors.capaUrl.message}</p>}
      </div>

      <div className="border-t border-border pt-6">
        <label className="flex min-h-11 items-center justify-between gap-3">
          <span>
            <span className="block text-sm font-semibold text-ink-primary">Curso gratuito</span>
            <span className="block text-xs text-ink-tertiary">Desativa para definir um preço.</span>
          </span>
          <input
            type="checkbox"
            {...register('gratuito')}
            className="h-5 w-5 accent-[var(--accent-terracotta)]"
          />
        </label>
        {!isFree && (
          <div className="mt-4 grid grid-cols-[1fr_88px] gap-3">
            <Input
              label="Preço"
              type="number"
              min={0}
              {...register('preco', { valueAsNumber: true })}
              error={errors.preco?.message}
            />
            <Input label="Moeda" maxLength={3} {...register('moeda')} error={errors.moeda?.message} />
          </div>
        )}
      </div>

      <p className="border-t border-border pt-5 text-xs leading-5 text-ink-tertiary">
        O vídeo introdutório deve ser o primeiro item de vídeo do currículo.
      </p>
    </div>
  );
}

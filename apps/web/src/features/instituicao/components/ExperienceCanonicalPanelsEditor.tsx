import { useFieldArray, type Control, type UseFormRegister, type UseFormSetValue, type UseFormWatch } from 'react-hook-form';
import type { CriarExperienciaPayload } from '@pdc/shared';
import { BuilderUploadZone } from '@/components/builders';
import { Button, Input } from '@/components/ui';
import { ExperienceEmployersEditor } from './ExperienceEmployersEditor';

interface Props {
  panel: 'realidade' | 'vozes' | 'guia';
  control: Control<CriarExperienciaPayload>;
  register: UseFormRegister<CriarExperienciaPayload>;
  watch: UseFormWatch<CriarExperienciaPayload>;
  setValue: UseFormSetValue<CriarExperienciaPayload>;
}

function muralPath(index: number, field: 'autor' | 'cargo' | 'depoimento') {
  return `muralVozes.${String(index)}.${field}` as `muralVozes.${number}.${typeof field}`;
}

function timelinePath(index: number, field: 'ano' | 'foco') {
  return `guiaInstitucional.timelineCurricular.${String(index)}.${field}` as
    `guiaInstitucional.timelineCurricular.${number}.${typeof field}`;
}

export function ExperienceCanonicalPanelsEditor(props: Props): React.JSX.Element {
  const mural = useFieldArray({ control: props.control, name: 'muralVozes' });
  const timeline = useFieldArray({ control: props.control, name: 'guiaInstitucional.timelineCurricular' });

  if (props.panel === 'realidade') {
    return (
      <div className="space-y-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Salário médio" {...props.register('painelRealidade.salarioMedio')} />
          <Input label="Empregabilidade" {...props.register('painelRealidade.taxaEmpregabilidade')} />
          <Input label="Taxa de conclusão" {...props.register('painelRealidade.taxaConclusao')} />
        </div>
        <ExperienceEmployersEditor control={props.control} register={props.register} setValue={props.setValue} />
      </div>
    );
  }

  if (props.panel === 'vozes') {
    return (
      <div className="space-y-7">
        {mural.fields.map((field, index) => (
          <section key={field.id} className="space-y-4 border-t border-border pt-6 first:border-t-0 first:pt-0">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Autor" {...props.register(muralPath(index, 'autor'))} />
              <Input label="Cargo ou função" {...props.register(muralPath(index, 'cargo'))} />
            </div>
            <textarea
              aria-label={`Depoimento ${String(index + 1)}`}
              className="min-h-28 w-full border border-border bg-recessed p-3 text-sm outline-none focus:border-accent"
              {...props.register(muralPath(index, 'depoimento'))}
            />
            <Button type="button" variant="ghost" size="sm" className="text-accent-danger" onClick={() => { mural.remove(index); }}>
              Remover depoimento
            </Button>
          </section>
        ))}
        <Button type="button" variant="outline" onClick={() => { mural.append({ tipo: 'aluno', autor: '', cargo: '', depoimento: '' }); }}>
          Adicionar depoimento
        </Button>
      </div>
    );
  }

  const photos = props.watch('guiaInstitucional.fotosCampus') ?? [];
  return (
    <div className="space-y-10">
      <div>
        <h3 className="mb-4 text-sm font-semibold text-ink-primary">Campus e laboratórios</h3>
        <BuilderUploadZone
          multiple
          accept="image/*"
          onUploadComplete={(urls) => {
            props.setValue('guiaInstitucional.fotosCampus', [...photos, ...urls], { shouldDirty: true });
          }}
        />
        {photos.length > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {photos.map((url, index) => (
              <div key={url} className="border border-border bg-recessed">
                <img src={url} alt={`Campus ${String(index + 1)}`} className="aspect-video w-full object-cover" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    props.setValue('guiaInstitucional.fotosCampus', photos.filter((_, current) => current !== index), { shouldDirty: true });
                  }}
                >
                  Remover
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-5">
        <h3 className="text-sm font-semibold text-ink-primary">Timeline curricular</h3>
        {timeline.fields.map((field, index) => (
          <div key={field.id} className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)_auto] sm:items-end">
            <Input label="Ano ou fase" {...props.register(timelinePath(index, 'ano'))} />
            <Input label="Foco principal" {...props.register(timelinePath(index, 'foco'))} />
            <Button type="button" variant="ghost" onClick={() => { timeline.remove(index); }}>Remover</Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => { timeline.append({ ano: '', foco: '' }); }}>
          Adicionar fase
        </Button>
      </div>
    </div>
  );
}

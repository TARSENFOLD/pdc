import { useFieldArray, type Control, type UseFormRegister, type UseFormSetValue } from 'react-hook-form';
import { Building2, Plus, Trash2 } from 'lucide-react';
import type { CriarExperienciaPayload } from '@pdc/shared';
import { BuilderUploadZone } from '@/components/builders';
import { Button, Input } from '@/components/ui';

interface ExperienceEmployersEditorProps {
  control: Control<CriarExperienciaPayload>;
  register: UseFormRegister<CriarExperienciaPayload>;
  setValue: UseFormSetValue<CriarExperienciaPayload>;
}

function employerPath(
  index: number,
  field: 'nome' | 'setor' | 'logoUrl' | 'url',
): `painelRealidade.principaisEmpregadores.${number}.${typeof field}` {
  return `painelRealidade.principaisEmpregadores.${String(index)}.${field}` as
    `painelRealidade.principaisEmpregadores.${number}.${typeof field}`;
}

export function ExperienceEmployersEditor({
  control,
  register,
  setValue,
}: ExperienceEmployersEditorProps): React.JSX.Element {
  const employers = useFieldArray({
    control,
    name: 'painelRealidade.principaisEmpregadores',
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-ink-primary">Principais empregadores</h3>
          <p className="mt-1 text-xs text-ink-secondary">Organizações que contratam profissionais desta área em Angola.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => { employers.append({ nome: '', setor: '' }); }}
        >
          <Plus size={15} /> Adicionar
        </Button>
      </div>

      {employers.fields.length === 0 ? (
        <div className="border border-dashed border-border px-5 py-8 text-center">
          <Building2 className="mx-auto text-ink-tertiary" size={28} />
          <p className="mt-3 text-sm text-ink-secondary">Nenhum empregador adicionado.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {employers.fields.map((field, index) => (
            <section key={field.id} className="border-t border-border pt-6 first:border-t-0 first:pt-0">
              <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_180px]">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Nome" {...register(employerPath(index, 'nome'))} />
                  <Input label="Setor" {...register(employerPath(index, 'setor'))} />
                  <div className="sm:col-span-2">
                    <Input label="Site oficial" type="url" {...register(employerPath(index, 'url'))} />
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold text-ink-secondary">Logótipo</p>
                  {field.logoUrl ? (
                    <div className="border border-border bg-canvas p-4">
                      <img src={field.logoUrl} alt="" className="h-16 w-full object-contain" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="mt-2 w-full"
                        onClick={() => {
                          setValue(employerPath(index, 'logoUrl'), undefined, { shouldDirty: true });
                        }}
                      >
                        Remover logo
                      </Button>
                    </div>
                  ) : (
                    <BuilderUploadZone
                      accept="image/*"
                      onUploadComplete={(urls) => {
                        const logoUrl = urls[0];
                        if (logoUrl) {
                          setValue(employerPath(index, 'logoUrl'), logoUrl, { shouldDirty: true });
                        }
                      }}
                    />
                  )}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-4 text-accent-danger"
                onClick={() => { employers.remove(index); }}
              >
                <Trash2 size={15} /> Remover empregador
              </Button>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

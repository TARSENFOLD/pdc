import type { UseFormReturn } from 'react-hook-form';
import type { ChangeEvent } from 'react';
import type { CriarProgramaPayload } from '@pdc/shared';
import { Input, Select } from '@/components/ui';

export function ProgramaResourcesFields({
  form,
}: {
  form: UseFormReturn<CriarProgramaPayload>;
}): React.JSX.Element {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <ListField
        label="Materiais"
        value={form.watch('recursos.materiais') ?? []}
        onChange={(value) => { form.setValue('recursos.materiais', value, { shouldDirty: true, shouldValidate: true }); }}
      />
      <ListField
        label="Infraestrutura"
        value={form.watch('recursos.infraestrutura') ?? []}
        onChange={(value) => { form.setValue('recursos.infraestrutura', value, { shouldDirty: true, shouldValidate: true }); }}
      />
      <ListField
        label="Equipa"
        value={form.watch('recursos.equipa') ?? []}
        onChange={(value) => { form.setValue('recursos.equipa', value, { shouldDirty: true, shouldValidate: true }); }}
      />
    </div>
  );
}

export function ProgramaPriceFields({
  form,
}: {
  form: UseFormReturn<CriarProgramaPayload>;
}): React.JSX.Element {
  const isPaid = form.watch('precoPolicy.modo') === 'pago';

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Select
          label="Modelo de acesso"
          {...form.register('precoPolicy.modo', {
            onChange: (event: ChangeEvent<HTMLSelectElement>) => {
              if (event.target.value === 'gratuito') {
                form.setValue('precoPolicy.valor', 0, { shouldDirty: true, shouldValidate: true });
              }
            },
          })}
        >
          <option value="gratuito">Gratuito</option>
          <option value="pago">Pago</option>
        </Select>
        <Input
          label="Valor"
          type="number"
          min={0}
          readOnly={!isPaid}
          className={!isPaid ? 'opacity-60' : undefined}
          {...form.register('precoPolicy.valor', {
            setValueAs: (value: string) => {
              if (value === '') return isPaid ? undefined : 0;
              const price = Number(value);
              return Number.isFinite(price) ? price : undefined;
            },
          })}
        />
        <Input label="Moeda" maxLength={3} {...form.register('precoPolicy.moeda')} />
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm text-ink-secondary">
        <input
          type="checkbox"
          className="h-4 w-4 accent-[var(--accent-terracotta)]"
          {...form.register('precoPolicy.bolsasDisponiveis')}
        />
        Disponibilizar bolsas ou descontos
      </label>
      {form.watch('precoPolicy.bolsasDisponiveis') && (
        <textarea
          aria-label="Descrição das bolsas"
          className="min-h-24 w-full rounded-lg border border-border bg-recessed px-4 py-3 text-sm outline-none focus:border-accent"
          placeholder="Explica critérios e condições das bolsas."
          {...form.register('precoPolicy.descricaoBolsas')}
        />
      )}
    </div>
  );
}

function ListField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
}): React.JSX.Element {
  return (
    <label className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-ink-tertiary">{label}</span>
      <textarea
        aria-label={label}
        value={value.join('\n')}
        onChange={(event) => {
          onChange(event.target.value.split('\n').map((item) => item.trim()).filter(Boolean));
        }}
        className="min-h-32 w-full rounded-lg border border-border bg-recessed px-3 py-2 text-sm outline-none focus:border-accent"
        placeholder="Um item por linha"
      />
    </label>
  );
}

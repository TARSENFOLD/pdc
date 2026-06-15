import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import type { CriarExperienciaPayload } from '@pdc/shared';
import { Input, Select } from '@/components/ui';

interface ExperienceIdentityFieldsProps {
  register: UseFormRegister<CriarExperienciaPayload>;
  errors: FieldErrors<CriarExperienciaPayload>;
}

export function ExperienceIdentityFields({
  register,
  errors,
}: ExperienceIdentityFieldsProps): React.JSX.Element {
  return (
    <div className="space-y-6">
      <Input label="Título da Experiência" {...register('titulo')} error={errors.titulo?.message} />
      <div className="space-y-1">
        <label className="text-sm font-bold uppercase text-ink-tertiary">Descrição narrativa</label>
        <textarea
          aria-label="Descrição narrativa"
          className="min-h-32 w-full border border-border bg-recessed px-4 py-3 text-sm outline-none focus:border-accent"
          {...register('descricao')}
        />
        {errors.descricao && <p className="text-xs text-accent-danger">{errors.descricao.message}</p>}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Select label="Área vocacional" {...register('area')}>
          <option value="TECNOLOGIA">Tecnologia</option>
          <option value="SAUDE">Saúde</option>
          <option value="GESTAO">Gestão</option>
          <option value="ARTES">Artes</option>
          <option value="ENGENHARIA">Engenharia</option>
          <option value="DIREITO">Direito</option>
          <option value="EDUCACAO">Educação</option>
          <option value="COMUNICACAO">Comunicação</option>
          <option value="CIENCIAS_SOCIAIS">Ciências Sociais</option>
          <option value="CIENCIAS_NATURAIS">Ciências Naturais</option>
          <option value="CIENCIAS_AGRARIAS">Ciências Agrárias</option>
          <option value="ARQUITETURA">Arquitetura</option>
          <option value="TURISMO_HOTELARIA">Turismo e Hotelaria</option>
          <option value="DESPORTO">Desporto</option>
          <option value="OUTRA">Outra</option>
        </Select>
        <Select label="Nível" {...register('nivel')}>
          <option value="basico">Básico</option>
          <option value="medio">Médio</option>
          <option value="avancado">Avançado</option>
        </Select>
        <Select label="Modalidade" {...register('modalidade')}>
          <option value="presencial">Presencial</option>
          <option value="online">Online</option>
          <option value="hibrido">Híbrido</option>
        </Select>
      </div>
      <div className="max-w-xs">
        <Input
          label="Duração (horas)"
          type="number"
          min={1}
          max={10000}
          {...register('duracaoEstimada', {
            setValueAs: (value: unknown) => value === '' ? undefined : Number(value),
          })}
          error={errors.duracaoEstimada?.message}
        />
      </div>
    </div>
  );
}

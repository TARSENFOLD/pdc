import type { UseFormReturn } from 'react-hook-form';
import type { CriarProgramaPayload } from '@pdc/shared';
import { Coins, Image } from 'lucide-react';
import { BuilderSection, BuilderUploadZone } from '@/components/builders';
import { Input, Select } from '@/components/ui';
import ProgramaContentSelector from './ProgramaContentSelector';
import { ProgramaPriceFields, ProgramaResourcesFields } from './ProgramaPolicyFields';

export default function ProgramaFormSections({
  form,
}: {
  form: UseFormReturn<CriarProgramaPayload>;
}): React.JSX.Element {
  const { register, setValue, formState: { errors } } = form;

  return (
    <>
      <BuilderSection value="proposito" title="Propósito e Identidade" description="O valor diferenciador e objetivo pedagógico central.">
        <div className="space-y-6">
          <Input label="Título do Programa" {...register('titulo')} error={errors.titulo?.message} />
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-ink-tertiary">
              <Image size={14} className="text-accent" /> Imagem de Capa
            </p>
            {form.watch('capaUrl') ? (
              <div className="relative h-32 w-full overflow-hidden rounded-lg border border-border">
                <img src={form.watch('capaUrl') ?? ''} alt="Capa" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => { setValue('capaUrl', null, { shouldDirty: true }); }}
                  className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full bg-canvas/80 text-sm font-black text-ink-tertiary backdrop-blur-sm hover:text-accent"
                  aria-label="Remover capa"
                >
                  ×
                </button>
              </div>
            ) : (
              <BuilderUploadZone
                entityType="capa"
                onUploadComplete={(urls) => { if (urls[0]) setValue('capaUrl', urls[0]); }}
              />
            )}
          </div>
          <TextAreaField
            label="Objetivo Soberano (Propósito)"
            valueLength={form.watch('proposito').length}
            error={errors.proposito?.message}
            registration={register('proposito')}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Domínio Vocacional" {...register('area')}>
              {AREA_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
            <Select label="Tipo de Programa" {...register('tipo')}>
              <option value="standard">Standard</option>
              <option value="shadowapro">Shadow a Pro</option>
              <option value="eduvisit">EduVisita</option>
            </Select>
          </div>
        </div>
      </BuilderSection>

      <BuilderSection value="metodologia" title="Metodologia e Recursos" description="Como o programa é entregue e que meios são disponibilizados.">
        <div className="space-y-6">
          <TextAreaField
            label="Descrição Metodológica"
            valueLength={form.watch('metodologia').length}
            error={errors.metodologia?.message}
            registration={register('metodologia')}
          />
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-tertiary">Recursos disponíveis</p>
            <ProgramaResourcesFields form={form} />
          </div>
        </div>
      </BuilderSection>

      <BuilderSection value="conteudos" title="Conteúdos Agrupados" description="Integração de cursos, simulações e experiências práticas.">
        <ProgramaContentSelector
          selected={{
            cursosIds: form.watch('cursosIds') ?? [],
            experienciasIds: form.watch('experienciasIds') ?? [],
            simulacoesIds: form.watch('simulacoesIds') ?? [],
            projetosIds: form.watch('projetosIds') ?? [],
          }}
          onChange={(field, ids) => { setValue(field, ids, { shouldDirty: true }); }}
        />
      </BuilderSection>

      <BuilderSection value="inscricao" title="Regras de Inscrição e Preço" description="Governação de acesso e política comercial.">
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Modalidade" {...register('modalidade')}>
              <option value="presencial">Presencial</option>
              <option value="online">Online</option>
              <option value="hibrido">Híbrido</option>
            </Select>
            <Input label="Vagas Totais" type="number" {...register('vagas', { valueAsNumber: true })} />
          </div>
          <div className="space-y-4">
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-ink-tertiary">
              <Coins size={14} className="text-accent" /> Política de Preços
            </p>
            <ProgramaPriceFields form={form} />
          </div>
        </div>
      </BuilderSection>
    </>
  );
}

const AREA_OPTIONS = [
  ['SAUDE', 'Saúde'], ['ENGENHARIA', 'Engenharia'], ['TECNOLOGIA', 'Tecnologia'],
  ['DIREITO', 'Direito'], ['GESTAO', 'Gestão'], ['EDUCACAO', 'Educação'],
  ['ARTES', 'Artes'], ['CIENCIAS_AGRARIAS', 'Ciências Agrárias'],
  ['CIENCIAS_SOCIAIS', 'Ciências Sociais'], ['COMUNICACAO', 'Comunicação'],
  ['CIENCIAS_NATURAIS', 'Ciências Naturais'], ['ARQUITETURA', 'Arquitetura'],
  ['TURISMO_HOTELARIA', 'Turismo e Hotelaria'], ['DESPORTO', 'Desporto'],
  ['OUTRA', 'Outra'],
] as const;

function TextAreaField({
  label,
  valueLength,
  error,
  registration,
}: {
  label: string;
  valueLength: number;
  error: string | undefined;
  registration: ReturnType<UseFormReturn<CriarProgramaPayload>['register']>;
}): React.JSX.Element {
  return (
    <div className="space-y-1">
      <label className="text-sm font-bold uppercase tracking-widest text-ink-tertiary">{label}</label>
      <textarea
        className="min-h-[120px] w-full rounded-lg border border-border bg-recessed px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
        maxLength={2000}
        {...registration}
      />
      <div className="flex items-center justify-between">
        {error ? <p className="text-xs text-accent-danger">{error}</p> : <span />}
        <p className="text-[10px] text-ink-tertiary">{valueLength}/2000 (mín. 10)</p>
      </div>
    </div>
  );
}

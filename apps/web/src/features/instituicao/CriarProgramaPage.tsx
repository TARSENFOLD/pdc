import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CriarProgramaPayloadSchema, type CriarProgramaPayload, type CronogramaEtapa } from '@pdc/shared';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { programasApi } from '@/lib/api/programas';
import { Button, Card, Input } from '@/components/ui';
import { toast } from '@/hooks/useToast';

function CronogramaBuilder({
  etapas,
  onChange,
}: {
  etapas: (CronogramaEtapa & { id?: string })[];
  onChange: (etapas: (CronogramaEtapa & { id?: string })[]) => void;
}) {
  function addEtapa() {
    onChange([...etapas, { id: crypto.randomUUID(), titulo: '', dataInicio: '', dataFim: '', responsavel: '' }]);
  }

  function removeEtapa(id?: string) {
    onChange(etapas.filter((e) => e.id !== id));
  }

  function updateEtapa(id: string | undefined, field: keyof CronogramaEtapa, value: string) {
    const updated = etapas.map((e) => (e.id === id ? { ...e, [field]: value } : e));
    onChange(updated);
  }

  return (
    <div className="space-y-3">
      {etapas.map((etapa) => (
        <div key={etapa.id} className="rounded-md border border-border bg-surface-raised p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary">Etapa</span>
            <button
              type="button"
              onClick={() => { removeEtapa(etapa.id); }}
              className="text-xs text-error hover:underline"
            >
              Remover
            </button>
          </div>
          <Input
            placeholder="Título da etapa"
            value={etapa.titulo}
            onChange={(e) => { updateEtapa(etapa.id, 'titulo', e.target.value); }}
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-text-muted">Data início</label>
              <input
                type="date"
                value={etapa.dataInicio?.slice(0, 10) ?? ''}
                onChange={(e) => { updateEtapa(etapa.id, 'dataInicio', e.target.value); }}
                className="mt-1 w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted">Data fim</label>
              <input
                type="date"
                value={etapa.dataFim?.slice(0, 10) ?? ''}
                onChange={(e) => { updateEtapa(etapa.id, 'dataFim', e.target.value); }}
                className="mt-1 w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm"
              />
            </div>
          </div>
          <Input
            placeholder="Responsável (nome ou cargo)"
            value={etapa.responsavel ?? ''}
            onChange={(e) => { updateEtapa(etapa.id, 'responsavel', e.target.value); }}
          />
        </div>
      ))}
      <Button type="button" variant="secondary" size="sm" onClick={addEtapa}>
        + Adicionar Etapa
      </Button>
    </div>
  );
}

export default function CriarProgramaPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [etapas, setEtapas] = useState<CronogramaEtapa[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CriarProgramaPayload>({
    resolver: zodResolver(CriarProgramaPayloadSchema),
    defaultValues: {
      titulo: '',
      descricao: '',
      proposito: '',
      metodologia: '',
      tipo: 'standard',
      area: 'GESTAO',
      modalidade: 'presencial',
      criadorTipo: 'instituicao',
      vagas: 1,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: CriarProgramaPayload) => {
      const payload: CriarProgramaPayload = {
        ...data,
        cronograma: etapas.length > 0 ? { etapas } : undefined,
      };
      return programasApi.create(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['programas', 'meus'] });
      toast({ title: 'Programa criado!' });
      navigate('/app/dashboard/instituicao');
    },
    onError: () => toast({ title: 'Erro ao criar', variant: 'error' }),
  });

  const tipoOptions = [
    { value: 'standard', label: 'Standard' },
    { value: 'shadowapro', label: 'Shadow a Pro' },
    { value: 'eduvisit', label: 'EduVisita' },
  ];

  const areaOptions = [
    'SAUDE', 'ENGENHARIA', 'TECNOLOGIA', 'DIREITO', 'GESTAO',
    'EDUCACAO', 'ARTES', 'CIENCIAS_AGRARIAS', 'CIENCIAS_SOCIAIS',
    'COMUNICACAO', 'CIENCIAS_NATURAIS', 'ARQUITETURA',
    'TURISMO_HOTELARIA', 'DESPORTO', 'OUTRA',
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Novo Programa de Acesso</h1>
      <p className="text-sm text-text-secondary mb-6">Preenche os 5 elementos canónicos para garantir a qualidade do programa.</p>

      <Card className="p-6">
        <form
          onSubmit={(e) => {
            void handleSubmit((data) => {
              mutation.mutate(data);
            })(e);
          }}
          className="space-y-6"
        >
          {/* Básico */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">Informação Base</h2>

            <Input
              label="Título *"
              {...register('titulo')}
              error={errors.titulo?.message}
            />

            <div className="space-y-1">
              <label className="text-sm font-medium">Descrição</label>
              <textarea
                className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...register('descricao')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Tipo *</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  {...register('tipo')}
                >
                  {tipoOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Área *</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  {...register('area')}
                >
                  {areaOptions.map((a) => (
                    <option key={a} value={a}>{a.replaceAll('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Modalidade</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  {...register('modalidade')}
                >
                  <option value="presencial">Presencial</option>
                  <option value="online">Online</option>
                  <option value="hibrido">Híbrido</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Criado por</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  {...register('criadorTipo')}
                >
                  <option value="instituicao">Instituição</option>
                  <option value="mentor">Mentor</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Vagas"
                type="number"
                min={1}
                {...register('vagas', { valueAsNumber: true })}
              />
              <Input
                label="Duração"
                placeholder="ex: 3 meses"
                {...register('duracao')}
              />
            </div>
          </section>

          {/* 5 Elementos Canónicos */}
          <section className="space-y-4 border-t border-border pt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
              5 Elementos Canónicos
            </h2>

            {/* 1. Propósito */}
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Propósito *{' '}
                <span className="text-xs font-normal text-text-muted">Qual o objetivo principal deste programa?</span>
              </label>
              <textarea
                className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...register('proposito')}
              />
              {errors.proposito && (
                <p className="text-xs text-error">{errors.proposito.message}</p>
              )}
            </div>

            {/* 2. Metodologia */}
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Metodologia{' '}
                <span className="text-xs font-normal text-text-muted">Como o programa é conduzido?</span>
              </label>
              <textarea
                className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...register('metodologia')}
              />
            </div>

            {/* 3. Cronograma */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Cronograma{' '}
                <span className="text-xs font-normal text-text-muted">Etapas e datas do programa</span>
              </label>
              <CronogramaBuilder etapas={etapas} onChange={setEtapas} />
            </div>

            {/* 4. Regras de Matrícula */}
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Regras de Matrícula{' '}
                <span className="text-xs font-normal text-text-muted">Critérios de admissão</span>
              </label>
              <textarea
                className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="ex: Estudantes do 3º ano de Engenharia com média ≥ 14 valores"
                {...register('requisitos')}
              />
            </div>

            {/* 5. Datas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Data de Início</label>
                <input
                  type="date"
                  className="w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm"
                  value={watch('dataInicio')?.slice(0, 10) ?? ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      // Interpret local midnight to avoid day shift in ISO conversion
                      const [y, m, d] = e.target.value.split('-').map(Number);
                      setValue('dataInicio', new Date(y, m - 1, d).toISOString());
                    }
                  }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Data de Fim</label>
                <input
                  type="date"
                  className="w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm"
                  value={watch('dataFim')?.slice(0, 10) ?? ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      // Interpret local midnight to avoid day shift in ISO conversion
                      const [y, m, d] = e.target.value.split('-').map(Number);
                      setValue('dataFim', new Date(y, m - 1, d).toISOString());
                    }
                  }}
                />
              </div>
            </div>
          </section>

          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? 'A criar...' : 'Criar Programa'}
          </Button>
        </form>
      </Card>
    </div>
  );
}

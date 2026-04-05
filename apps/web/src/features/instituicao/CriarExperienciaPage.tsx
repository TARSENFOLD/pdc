import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CriarExperienciaPayloadSchema, type CriarExperienciaPayload } from '@pdc/shared';
import { experienciasApi } from '@/lib/api/experiencias';
import { Card, Button, Input } from '@/components/ui';
import { toast } from '@/hooks/useToast';

export function CriarExperienciaPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<CriarExperienciaPayload>({
    resolver: zodResolver(CriarExperienciaPayloadSchema),
    defaultValues: {
      modalidade: 'presencial',
    }
  });

  const mutation = useMutation({
    mutationFn: (data: CriarExperienciaPayload) => experienciasApi.criar(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiencias', 'minhas'] });
      toast({ title: 'Experiência criada com sucesso!' });
      navigate('/app/instituicao/experiencias');
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao criar experiência', description: err.message, variant: 'error' });
    }
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Criar Nova Experiência</h1>
        <p className="text-muted-foreground">Preencha os dados abaixo para publicar uma nova experiência educativa.</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit((data: CriarExperienciaPayload) => { mutation.mutate(data); })} className="space-y-4">
          <Input 
            label="Título da Experiência" 
            placeholder="Ex: Workshop de Engenharia Civil"
            {...register('titulo')}
            error={errors.titulo?.message || ''}
          />
          
          <div className="space-y-1">
            <label className="text-sm font-medium">Descrição</label>
            <textarea 
              className="flex min-h-[100px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Explique o que os alunos vão aprender..."
              {...register('descricao')}
            />
            {errors.descricao && <p className="text-xs text-error">{errors.descricao.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Área" 
              placeholder="Ex: Engenharia"
              {...register('area')}
              error={errors.area?.message || ''}
            />
            <Input 
              label="Vagas (Opcional)" 
              type="number"
              {...register('vagas', { valueAsNumber: true })}
              error={errors.vagas?.message || ''}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Modalidade</label>
              <select 
                className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
                {...register('modalidade')}
              >
                <option value="presencial">Presencial</option>
                <option value="remoto">Remoto</option>
                <option value="hibrido">Híbrido</option>
              </select>
            </div>
            <Input 
              label="Localização (se aplicável)" 
              placeholder="Ex: Campus Luanda"
              {...register('localizacao')}
              error={errors.localizacao?.message || ''}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Data de Início" 
              type="datetime-local"
              {...register('dataInicio')}
              error={errors.dataInicio?.message || ''}
            />
            <Input 
              label="Data de Fim (Opcional)" 
              type="datetime-local"
              {...register('dataFim')}
              error={errors.dataFim?.message || ''}
            />
          </div>

          <div className="rounded-md bg-amber/10 p-3 text-sm text-amber border border-amber/20">
            ℹ️ As experiências são <strong>sempre gratuitas</strong> para os alunos.
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => { navigate(-1); }}>Cancelar</Button>
            <Button type="submit" isLoading={mutation.isPending}>
              Criar Experiência
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CriarExperienciaPayloadSchema, type CriarExperienciaPayload } from '@pdc/shared';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { experienciasApi } from '@/lib/api/experiencias';
import { Button, Card, Input } from '@/components/ui';
import { toast } from '@/hooks/useToast';

export function CriarExperienciaPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { register, handleSubmit, formState: { errors } } = useForm<CriarExperienciaPayload>({
    resolver: zodResolver(CriarExperienciaPayloadSchema),
    defaultValues: {
      titulo: '',
      descricao: '',
      area: 'SAUDE',
      modalidade: 'online',
    }
  });

  const mutation = useMutation({
    mutationFn: (data: CriarExperienciaPayload) => experienciasApi.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['experiencias', 'minhas'] });
      toast({ title: 'Experiência criada!' });
      navigate('/app/dashboard/instituicao');
    },
    onError: () => toast({ title: 'Erro ao criar', variant: 'error' })
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Nova Experiência Profissional</h1>
      
      <Card className="p-6">
        <form onSubmit={(e) => { void handleSubmit((data) => { mutation.mutate(data); })(e); }} className="space-y-4">
          <Input 
            label="Título" 
            {...register('titulo')} 
            error={errors.titulo?.message} 
          />
          <div className="space-y-1">
            <label className="text-sm font-medium">Descrição</label>
            <textarea 
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              {...register('descricao')}
            />
            {errors.descricao && <p className="text-xs text-error">{errors.descricao.message}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? 'A criar...' : 'Criar Experiência'}
          </Button>
        </form>
      </Card>
    </div>
  );
}

import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CriarProgramaPayloadSchema, type CriarProgramaPayload } from '@pdc/shared';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { programasApi } from '@/lib/api/programas';
import { Button, Card, Input } from '@/components/ui';
import { toast } from '@/hooks/useToast';

export function CriarProgramaPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { register, handleSubmit, formState: { errors } } = useForm<CriarProgramaPayload>({
    resolver: zodResolver(CriarProgramaPayloadSchema),
    defaultValues: {
      titulo: '',
      descricao: '',
      tipo: 'standard' as any,
      area: 'GESTAO' as any,
      modalidade: 'PRESENCIAL' as any,
      vagas: 1,
    }
  });

  const mutation = useMutation({
    mutationFn: (data: CriarProgramaPayload) => programasApi.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['programas', 'meus'] });
      toast({ title: 'Programa criado!' });
      navigate('/app/dashboard/instituicao');
    },
    onError: () => toast({ title: 'Erro ao criar', variant: 'error' })
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Novo Programa de Acesso</h1>
      
      <Card className="p-6">
        <form 
          onSubmit={(e) => { 
            void handleSubmit((data) => { 
              mutation.mutate(data as CriarProgramaPayload); 
            })(e); 
          }} 
          className="space-y-4"
        >
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
            {mutation.isPending ? 'A criar...' : 'Criar Programa'}
          </Button>
        </form>
      </Card>
    </div>
  );
}

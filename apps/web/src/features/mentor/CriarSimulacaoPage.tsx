import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { CriarSimulacaoPayloadSchema, type CriarSimulacaoPayload, type EstadoEditorial } from '@pdc/shared';
import { simulacoesApi } from '@/lib/api/simulacoes';
import { Card, Button, Input, Spinner } from '@/components/ui';
import { toast } from '@/hooks/useToast';
import { ArrowLeft, Save, Send } from 'lucide-react';
import { useEffect } from 'react';

interface SimulacaoDetail extends CriarSimulacaoPayload {
  id: string;
  estado: EstadoEditorial;
}

export function CriarSimulacaoPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: simData, isLoading: isLoadingSim } = useQuery({
    queryKey: ['simulacoes', id],
    queryFn: () => simulacoesApi.getById(id as string),
    enabled: isEditing,
  });

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<CriarSimulacaoPayload>({
    resolver: zodResolver(CriarSimulacaoPayloadSchema),
    defaultValues: {
      titulo: '',
      descricao: '',
      area: '',
      tipo: 1,
      capaUrl: '',
      iframeUrl: '',
    }
  });

  const selectedTipo = watch('tipo');

  useEffect(() => {
    if (simData) {
      const sim = simData as unknown as SimulacaoDetail;
      reset({
        titulo: sim.titulo,
        descricao: sim.descricao,
        area: sim.area || '',
        tipo: sim.tipo,
        capaUrl: sim.capaUrl || '',
        iframeUrl: sim.iframeUrl || '',
      });
    }
  }, [simData, reset]);

  const mutation = useMutation({
    mutationFn: (data: CriarSimulacaoPayload) => 
      isEditing ? simulacoesApi.editar(id, data) : simulacoesApi.criar(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simulacoes', 'minhas'] }).catch(() => {});
      toast({ title: isEditing ? 'Simulação atualizada!' : 'Simulação criada com sucesso!' });
      navigate('/app/mentor/simulacoes');
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao guardar simulação', description: err.message, variant: 'error' });
    }
  });

  const reviewMutation = useMutation({
    mutationFn: () => simulacoesApi.updateEstado(id as string, 'review'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simulacoes', id] }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['simulacoes', 'minhas'] }).catch(() => {});
      toast({ title: 'Enviada para revisão!' });
      navigate('/app/mentor/simulacoes');
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao enviar para revisão', description: err.message, variant: 'error' });
    }
  });

  if (isEditing && isLoadingSim) {
    return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>;
  }

  const handleFormSubmit = handleSubmit((data) => {
    mutation.mutate(data);
  });

  const handleReview = () => {
    reviewMutation.mutate();
  };

  const sim = simData as unknown as SimulacaoDetail | undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => { navigate('/app/mentor/simulacoes'); }}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold font-sora">{isEditing ? 'Editar Simulação' : 'Criar Nova Simulação'}</h1>
      </div>

      <Card className="p-6">
        <form onSubmit={(e) => { void handleFormSubmit(e); }} className="space-y-6">
          <Input 
            label="Título da Simulação" 
            placeholder="Ex: Diagnóstico de Circuito Elétrico"
            {...register('titulo')}
            error={errors.titulo?.message}
          />

          <div className="space-y-1">
            <label className="text-sm font-medium text-text-secondary">Descrição</label>
            <textarea 
              className="flex min-h-[120px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="O que o aluno deve fazer nesta simulação?"
              {...register('descricao')}
            />
            {errors.descricao && <p className="text-xs text-error font-medium">{errors.descricao.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-text-secondary">Área</label>
              <Input 
                placeholder="Ex: Engenharia"
                {...register('area')}
                error={errors.area?.message}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-text-secondary">Tipo de Simulação</label>
              <select 
                className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
                {...register('tipo', { valueAsNumber: true })}
              >
                <option value={1}>Tipo 1 (Quiz Interativo)</option>
                <option value={2}>Tipo 2 (Iframe Externo)</option>
                <option value={3}>Tipo 3 (Cenário de Decisão)</option>
              </select>
              {errors.tipo && <p className="text-xs text-error font-medium">{errors.tipo.message}</p>}
            </div>
          </div>

          <Input 
            label="URL da Capa (opcional)" 
            placeholder="https://exemplo.com/simulacao.jpg"
            {...register('capaUrl')}
            error={errors.capaUrl?.message}
          />

          {selectedTipo === 2 && (
            <Input 
              label="URL do Iframe" 
              placeholder="https://phet.colorado.edu/sims/html/..."
              {...register('iframeUrl')}
              error={errors.iframeUrl?.message}
            />
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border/40">
            <div className="flex gap-3">
              <Button type="submit" isLoading={mutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {isEditing ? 'Guardar Alterações' : 'Criar Simulação'}
              </Button>
              
              {isEditing && sim?.estado === 'draft' && (
                <Button 
                  type="button" 
                  variant="secondary" 
                  className="border-amber/50 text-amber hover:bg-amber/10"
                  onClick={handleReview}
                  isLoading={reviewMutation.isPending}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Submeter para Revisão
                </Button>
              )}
            </div>
            
            <Button type="button" variant="ghost" onClick={() => { navigate('/app/mentor/simulacoes'); }}>
              Cancelar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

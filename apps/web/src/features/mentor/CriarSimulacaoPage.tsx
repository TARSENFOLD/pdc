import { useState, useEffect } from 'react';
import { useForm, useFieldArray, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { CriarSimulacaoPayloadSchema, type CriarSimulacaoPayload, type EstadoEditorial } from '@pdc/shared';
import { simulacoesApi } from '@/lib/api/simulacoes';
import { Button, Input, Select, Spinner } from '@/components/ui';
import { toast } from '@/hooks/useToast';
import { BuilderShell, BuilderSection, BuilderUploadZone, BuilderActionsBar } from '@/components/builders';
import { EcosystemImpactPanel } from '@/components/ecosystem/EcosystemImpactPanel';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { Globe } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';

const CRITERIOS = [
  { id: 'fluidez', label: 'Fluidez \u03D5', desc: 'Métrica de velocidade e precisão cognitiva.' },
  { id: 'resiliencia', label: 'Resiliência R', desc: 'Capacidade de recuperação após erro.' },
  { id: 'foco', label: 'Foco Estável', desc: 'Consistência de atenção durante o processo.' },
] as const;

function materialPath(index: number, field: 'label') {
  return ['materiaisLab', index, field].join('.') as `materiaisLab.${number}.${typeof field}`;
}

function criterioPath(field: (typeof CRITERIOS)[number]['id']) {
  return ['criteriosAvaliacao', 'pesos', field].join('.') as `criteriosAvaliacao.pesos.${typeof field}`;
}

export function CriarSimulacaoPage() {
  const { id } = useParams<{ id: string }>();
  const simulacaoId = id ?? '';
  const isEditing = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [lastEventId, setLastEventId] = useState<string | null>(null);

  const { data: simData, isLoading: isLoadingSim } = useQuery({
    queryKey: ['simulacoes', simulacaoId],
    queryFn: () => simulacoesApi.getById(simulacaoId),
    enabled: isEditing,
  });

  const form = useForm<CriarSimulacaoPayload>({
    resolver: zodResolver(CriarSimulacaoPayloadSchema) as Resolver<CriarSimulacaoPayload>,
    defaultValues: {
      titulo: '',
      descricao: '',
      area: 'TECNOLOGIA',
      tipo: 1,
      tipoLab: 'sandbox',
      tentativasMaximas: 0,
      criteriosAvaliacao: {
        pesos: { fluidez: 40, resiliencia: 30, foco: 30 }
      },
      materiaisLab: [],
    }
  });

  const { register, reset, watch, formState: { errors } } = form;
  const selectedTipo = watch('tipo');
  const materiaisArray = useFieldArray({ control: form.control, name: 'materiaisLab' });

  useEffect(() => {
    if (!simData) return;
    reset({
      titulo: simData.titulo,
      descricao: simData.descricao,
      area: simData.area,
      tipo: simData.tipo,
      capaUrl: simData.capaUrl ?? '',
      iframeUrl: simData.iframeUrl ?? '',
      tipoLab: 'sandbox',
      tentativasMaximas: simData.tentativasMaximas ?? 0,
      criteriosAvaliacao: simData.criteriosAvaliacao,
      materiaisLab: simData.materiaisLab ?? [],
    });
  }, [simData, reset]);

  const mutation = useMutation({
    mutationFn: (data: CriarSimulacaoPayload) => isEditing ? simulacoesApi.editar(simulacaoId, data) : simulacoesApi.criar(data),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['simulacoes'] });
      toast({ title: isEditing ? 'Simulação Atualizada' : 'Simulação Materializada!' });

      if (res.eventId) {
        setLastEventId(res.eventId);
      } else {
        navigate('/app/mentor/simulacoes');
      }
    },
    onError: (err: { response?: { data?: { error?: string } }; message: string }) => {
      toast({ title: 'Falha na materialização', description: err.response?.data?.error || err.message, variant: 'error' });
    }
  });

  const stateMutation = useMutation({
    mutationFn: (estado: 'review' | 'published' | 'archived') => simulacoesApi.updateEstado(simulacaoId, estado),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['simulacoes', id] });
      void queryClient.invalidateQueries({ queryKey: ['simulacoes', 'minhas'] });
      toast({ title: 'Transição de estado concluída.' });
    }
  });

  const handleSave = async () => {
    const data = form.getValues();
    return mutation.mutateAsync(data);
  };

  if (isEditing && isLoadingSim) return <div className="flex h-screen items-center justify-center bg-canvas"><Spinner size="lg" /></div>;

  const currentEstado: EstadoEditorial = simData?.estado ?? 'draft';
  const pesoFluidez = watch('criteriosAvaliacao.pesos.fluidez');
  const pesoResiliencia = watch('criteriosAvaliacao.pesos.resiliencia');
  const pesoFoco = watch('criteriosAvaliacao.pesos.foco');
  const pesoTotal = pesoFluidez + pesoResiliencia + pesoFoco;

  return (
    <>
      <BuilderShell
        title={isEditing ? 'Editar simulação' : 'Criar simulação'}
        description="Configura o cenário, os materiais e os critérios usados durante a simulação."
        state={currentEstado}      breadcrumbs={[
        { label: 'Início', to: '/app' },
        { label: 'Simulações', to: '/app/mentor/simulacoes' },
        { label: isEditing ? 'Editar' : 'Novo Lab' }
      ]}
      sections={[
        { id: 'identidade', label: 'Identidade' },
        { id: 'setup', label: 'Conteúdo' },
        { id: 'criteria', label: 'Avaliação' },
      ]}
      actions={
        <BuilderActionsBar
          state={currentEstado}
          userRole={user?.role || 'mentor'}
          onSaveDraft={() => { void handleSave(); }}
          onSubmitReview={() => {
            void (async () => {
              if (currentEstado === 'draft' && isEditing) {
                 stateMutation.mutate('review');
              } else {
                 await handleSave();
                 if (isEditing) stateMutation.mutate('review');
              }
            })();
          }}
          onPublish={() => {
            if (currentEstado === 'approved' && isEditing) stateMutation.mutate('published');
          }}
          isSubmitting={mutation.isPending || stateMutation.isPending}
        />
      }
    >
      <BuilderSection
        value="identidade"
        title="Apresentação"
        description="Título, descrição e área da simulação."
      >
        <div className="space-y-6">
          <Input label="Título da Simulação" {...register('titulo')} error={errors.titulo?.message} />
          <div className="space-y-1">
            <label className="text-sm font-bold uppercase tracking-widest text-ink-tertiary">Contexto Narrativo</label>
            <textarea 
              className="flex min-h-[120px] w-full rounded-xl border border-ink-tertiary/20 bg-recessed px-4 py-3 text-sm focus:border-accent outline-none transition-all"
              {...register('descricao')}
            />
            {errors.descricao && <p className="text-xs text-accent-danger">{errors.descricao.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
             <Select label="Área de Domínio" {...register('area')}>
                <option value="TECNOLOGIA">Tecnologia</option>
                <option value="ENGENHARIA">Engenharia</option>
                <option value="SAUDE">Saúde</option>
                <option value="GESTAO">Gestão</option>
             </Select>
             <Select label="Tipo de Lab" {...register('tipoLab')}>
                <option value="sandbox">Sandbox (Treino)</option>
                <option value="prova">Prova (Avaliação)</option>
                <option value="desafio">Desafio (Ranking)</option>
                <option value="experimento">Experimento (R&D)</option>
             </Select>
          </div>
        </div>
      </BuilderSection>

      <BuilderSection
        value="setup"
        title="Conteúdo da simulação"
        description="Escolhe o formato, os materiais e o número de tentativas."
      >
        <div className="space-y-8">
           <div className="grid grid-cols-2 gap-4">
              <Select label="Motor de Execução" {...register('tipo', { valueAsNumber: true })}>
                <option value={1}>Tipo 1 (Quiz Psicométrico)</option>
                <option value={2}>Tipo 2 (Iframe Soberano)</option>
                <option value={3}>Tipo 3 (Cenário Imersivo)</option>
              </Select>
              <Input label="Tentativas Máximas" type="number" {...register('tentativasMaximas', { valueAsNumber: true })} />
           </div>

           {selectedTipo === 2 && (
             <div className="p-6 border border-accent/20 rounded-2xl bg-accent/5 space-y-4">
                <div className="flex items-center gap-2 text-accent">
                   <Globe size={18} />
                   <span className="text-[10px] font-black uppercase tracking-widest">Configuração Iframe</span>
                </div>
                <Input label="URL do Recurso Externo" {...register('iframeUrl')} placeholder="https://..." />
             </div>
           )}

           <div className="space-y-4">
              <p className="text-[10px] font-black text-ink-tertiary uppercase tracking-widest">Materiais e Documentação</p>
              <BuilderUploadZone onUploadComplete={(urls) => {
                if (urls.length > 0) {
                  materiaisArray.append({ id: crypto.randomUUID(), label: 'Novo Material', url: urls[0] ?? '' });
                }
              }} />
              {materiaisArray.fields.map((field, index) => (
                <div key={field.id} className="flex gap-4 items-end bg-recessed p-4 rounded-xl">
                   <Input label="Nome do Ficheiro" {...register(materialPath(index, 'label'))} className="flex-1" />
                   <Button variant="ghost" onClick={() => { materiaisArray.remove(index); }}>Remover</Button>
                </div>
              ))}
           </div>
        </div>
      </BuilderSection>

      <BuilderSection
        value="criteria"
        title="Critérios de Avaliação"
        description="Pesos dimensionais para o cálculo do Score Soberano (Total = 100%)."
      >
        <div className="space-y-8">
	           {CRITERIOS.map((dim) => (
             <div key={dim.id} className="space-y-2">
                <div className="flex justify-between items-end">
                   <div className="space-y-1">
                      <p className="text-sm font-bold text-ink-primary">{dim.label}</p>
                      <p className="text-[10px] text-ink-tertiary">{dim.desc}</p>
                   </div>
	                   <span className="font-mono font-black text-accent text-xl">{watch(criterioPath(dim.id))}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="100" 
                  className="w-full accent-accent"
	                  {...register(criterioPath(dim.id), { valueAsNumber: true })}
                />
             </div>
           ))}
           
           <div className="p-4 rounded-xl bg-canvas border border-ink-tertiary/10 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-ink-tertiary">Soma dos Pesos</span>
              <span className={cn(
                "font-mono font-black px-3 py-1 rounded-lg",
	                pesoTotal === 100
                  ? "bg-accent-success/10 text-accent-success"
                  : "bg-accent-danger/10 text-accent-danger"
              )}>
	                {pesoTotal}%
              </span>
           </div>
        </div>
      </BuilderSection>
    </BuilderShell>

    <AnimatePresence>
      {lastEventId && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-canvas/95 backdrop-blur-md"
        >
          <div className="w-full max-w-xl">
            <EcosystemImpactPanel 
              eventId={lastEventId} 
              variant="full"
              onComplete={() => {
                setTimeout(() => { navigate('/app/mentor/simulacoes'); }, 3000);
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}

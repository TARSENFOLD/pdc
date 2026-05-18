import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CriarProgramaPayloadSchema, type CriarProgramaPayload, type Programa } from '@pdc/shared';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { programasApi } from '@/lib/api/programas';
import { Input, Select, Spinner } from '@/components/ui';
import { toast } from '@/hooks/useToast';
import { BuilderShell, BuilderSection, BuilderActionsBar, BuilderUploadZone } from '@/components/builders';
import { EcosystemImpactPanel } from '@/components/ecosystem/EcosystemImpactPanel';
import { motion, AnimatePresence } from 'motion/react';
import { Layers, Coins, Image } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';

type ApiError = { response?: { data?: { error?: string } }; message?: string };

function getErrorMessage(err: ApiError): string {
  return err.response?.data?.error ?? err.message ?? 'Erro desconhecido';
}

export default function CriarProgramaPage() {
  const { id: editId } = useParams<{ id?: string }>();
  const isEditMode = !!editId;

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [lastEventId, setLastEventId] = useState<string | null>(null);

  const form = useForm<CriarProgramaPayload>({
    resolver: zodResolver(CriarProgramaPayloadSchema),
    defaultValues: {
      titulo: '',
      proposito: '',
      metodologia: '',
      tipo: 'standard',
      area: 'GESTAO',
      modalidade: 'presencial',
      vagas: 10,
      cursosIds: [],
      experienciasIds: [],
      simulacoesIds: [],
      projetosIds: [],
    }
  });

  const { register, setValue, formState: { errors } } = form;

  const { data: existingPrograma, isLoading: isLoadingPrograma } = useQuery({
    queryKey: ['programas', editId],
    queryFn: () => programasApi.getById(editId ?? ''),
    enabled: isEditMode,
  });

  useEffect(() => {
    if (!existingPrograma || !isEditMode) return;
    const p = existingPrograma;
    setValue('titulo', p.titulo);
    setValue('proposito', p.proposito);
    setValue('metodologia', p.metodologia);
    setValue('tipo', p.tipo);
    setValue('area', p.area);
    if (p.capaUrl) setValue('capaUrl', p.capaUrl);
    if (p.modalidade) setValue('modalidade', p.modalidade);
    if (p.vagas != null) setValue('vagas', p.vagas);
  }, [existingPrograma, isEditMode, setValue]);

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: ['programas', 'meus'] });
    if (editId) void queryClient.invalidateQueries({ queryKey: ['programas', editId] });
  };

  const createMutation = useMutation({
    mutationFn: (data: CriarProgramaPayload) => programasApi.create(data),
    onError: (err: ApiError) => toast({ title: 'Falha ao criar', description: getErrorMessage(err), variant: 'error' }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CriarProgramaPayload>) => programasApi.update(editId ?? '', data),
    onError: (err: ApiError) => toast({ title: 'Falha ao atualizar', description: getErrorMessage(err), variant: 'error' }),
  });

  const estadoMutation = useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: string }) =>
      programasApi.updateEstado(id, estado),
    onError: () => toast({ title: 'Falha na transição de estado', variant: 'error' }),
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending || estadoMutation.isPending;
  const currentState = existingPrograma?.estado ?? 'draft';

  const handleSaveDraft = () => {
    void form.handleSubmit(async (data) => {
      try {
        if (isEditMode) {
          await updateMutation.mutateAsync(data);
          invalidateAll();
          toast({ title: 'Programa Atualizado!' });
          navigate('/app/instituicao/programas');
        } else {
          const res = await createMutation.mutateAsync(data);
          invalidateAll();
          toast({ title: 'Programa Materializado!', description: 'O ecossistema foi atualizado com a nova oferta.' });
          const mutRes = res as Programa & { eventId?: string };
          if (mutRes.eventId) {
            setLastEventId(mutRes.eventId);
          } else {
            navigate('/app/instituicao/programas');
          }
        }
      } catch {
        // erros tratados pelos onError de cada mutation
      }
    })();
  };

  const handleSubmitReview = () => {
    void form.handleSubmit(async (data) => {
      try {
        let targetId = editId;
        if (isEditMode) {
          await updateMutation.mutateAsync(data);
        } else {
          const res = await createMutation.mutateAsync(data);
          targetId = res.id;
        }
        if (targetId) {
          await estadoMutation.mutateAsync({ id: targetId, estado: 'review' });
        }
        invalidateAll();
        toast({ title: 'Submetido para revisão com sucesso.' });
        navigate('/app/instituicao/programas');
      } catch {
        // erros tratados pelos onError de cada mutation
      }
    })();
  };

  const handlePublish = () => {
    if (!editId) return;
    void estadoMutation.mutateAsync({ id: editId, estado: 'published' }).then(() => {
      invalidateAll();
      toast({ title: 'Programa publicado!' });
      navigate('/app/instituicao/programas');
    });
  };

  if (isEditMode && isLoadingPrograma) {
    return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>;
  }

  return (
    <>
      <BuilderShell
        title={isEditMode ? 'Editar Programa' : 'Arquitetura de Programa de Acesso'}
        description={isEditMode
          ? 'Actualiza os dados do programa de acesso ao ecossistema.'
          : 'Agrupa ativos educativos, define o propósito e governa o acesso ao talento.'
        }
        state={currentState}
        breadcrumbs={[
          { label: 'Início', to: '/app' },
          { label: 'Programas', to: '/app/instituicao/programas' },
          { label: isEditMode ? 'Editar' : 'Novo Programa' }
        ]}
        sections={[
          { id: 'proposito', label: 'Propósito' },
          { id: 'metodologia', label: 'Metodologia' },
          { id: 'conteudos', label: 'Conteúdos' },
          { id: 'inscricao', label: 'Inscrição' },
        ]}
        actions={
          <BuilderActionsBar
            state={currentState}
            userRole={user?.role || 'instituicao'}
            onSaveDraft={handleSaveDraft}
            onSubmitReview={handleSubmitReview}
            onPublish={handlePublish}
            isSubmitting={isSubmitting}
          />
        }
      >
        <BuilderSection
          title="Propósito e Identidade"
          description="O valor diferenciador e objetivo pedagógico central."
        >
          <div className="space-y-6">
            <Input label="Título do Programa" {...register('titulo')} error={errors.titulo?.message} />

            {/* Upload de capa */}
            <div className="space-y-2">
              <p className="text-sm font-bold uppercase tracking-widest text-ink-tertiary flex items-center gap-2">
                <Image size={14} className="text-accent" /> Imagem de Capa
              </p>
              {form.watch('capaUrl') ? (
                <div className="relative h-32 w-full overflow-hidden rounded-2xl border border-ink-tertiary/10">
                  <img src={form.watch('capaUrl') ?? ''} alt="Capa" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setValue('capaUrl', null); }}
                    className="absolute top-2 right-2 h-7 w-7 rounded-full bg-canvas/80 backdrop-blur-sm flex items-center justify-center text-ink-tertiary hover:text-accent text-xs font-black"
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
            <div className="space-y-1">
              <label className="text-sm font-bold uppercase tracking-widest text-ink-tertiary">Objetivo Soberano (Propósito)</label>
              <textarea
                className="flex min-h-[120px] w-full rounded-xl border border-ink-tertiary/20 bg-recessed px-4 py-3 text-sm focus:border-accent outline-none transition-all"
                {...register('proposito')}
              />
              <div className="flex items-center justify-between">
                {errors.proposito ? <p className="text-xs text-accent-danger">{errors.proposito.message}</p> : <span />}
                <p className="text-[10px] text-ink-tertiary">{form.watch('proposito').length}/2000 (mín. 10)</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Select label="Domínio Vocacional" {...register('area')}>
                <option value="SAUDE">Saúde</option>
                <option value="ENGENHARIA">Engenharia</option>
                <option value="TECNOLOGIA">Tecnologia</option>
                <option value="DIREITO">Direito</option>
                <option value="GESTAO">Gestão</option>
                <option value="EDUCACAO">Educação</option>
                <option value="ARTES">Artes</option>
                <option value="CIENCIAS_AGRARIAS">Ciências Agrárias</option>
                <option value="CIENCIAS_SOCIAIS">Ciências Sociais</option>
                <option value="COMUNICACAO">Comunicação</option>
                <option value="CIENCIAS_NATURAIS">Ciências Naturais</option>
                <option value="ARQUITETURA">Arquitetura</option>
                <option value="TURISMO_HOTELARIA">Turismo e Hotelaria</option>
                <option value="DESPORTO">Desporto</option>
                <option value="OUTRA">Outra</option>
              </Select>
              <Select label="Tipo de Programa" {...register('tipo')}>
                <option value="standard">Standard</option>
                <option value="shadowapro">Shadow a Pro</option>
                <option value="eduvisit">EduVisita</option>
              </Select>
            </div>
          </div>
        </BuilderSection>

        <BuilderSection
          value="metodologia"
          title="Metodologia e Recursos"
          description="Como o programa é entregue e que meios são disponibilizados."
        >
          <div className="space-y-6">
            <div className="space-y-1">
              <label className="text-sm font-bold uppercase tracking-widest text-ink-tertiary">Descrição Metodológica</label>
              <textarea
                className="flex min-h-[120px] w-full rounded-xl border border-ink-tertiary/20 bg-recessed px-4 py-3 text-sm focus:border-accent outline-none transition-all"
                {...register('metodologia')}
              />
              <div className="flex items-center justify-between">
                {errors.metodologia ? <p className="text-xs text-accent-danger">{errors.metodologia.message}</p> : <span />}
                <p className="text-[10px] text-ink-tertiary">{form.watch('metodologia').length}/2000 (mín. 10)</p>
              </div>
            </div>
            <p className="text-[10px] font-black text-ink-tertiary uppercase tracking-widest">Recursos Didáticos (JSON Spec)</p>
            <div className="p-4 border border-ink-tertiary/10 rounded-xl bg-recessed/30 italic text-sm text-ink-secondary">
              Mapeamento de recursos técnicos e infraestrutura disponível em breve.
            </div>
          </div>
        </BuilderSection>

        <BuilderSection
          title="Conteúdos Agrupados"
          description="Integração de cursos, simulações e experiências práticas."
        >
          <div className="p-6 border border-dashed border-ink-tertiary/20 rounded-2xl bg-recessed/30 text-center space-y-4">
            <Layers size={32} className="mx-auto text-ink-tertiary opacity-40" />
            <p className="text-sm text-ink-secondary max-w-xs mx-auto">
              Seletor de conteúdos do catálogo para agregação soberana disponível na próxima iteração.
            </p>
            <div className="text-[9px] font-black uppercase tracking-widest text-ink-tertiary opacity-60">
              Módulos: {form.watch('cursosIds')?.length || 0} · Simul: {form.watch('simulacoesIds')?.length || 0}
            </div>
          </div>
        </BuilderSection>

        <BuilderSection
          value="inscricao"
          title="Regras de Inscrição e Preço"
          description="Governação de acesso e política comercial."
        >
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-4">
              <Select label="Modalidade" {...register('modalidade')}>
                <option value="presencial">Presencial</option>
                <option value="online">Online</option>
                <option value="hibrido">Híbrido</option>
              </Select>
              <Input label="Vagas Totais" type="number" {...register('vagas', { valueAsNumber: true })} />
            </div>
            <div className="space-y-4">
              <p className="text-[10px] font-black text-ink-tertiary uppercase tracking-widest flex items-center gap-2">
                <Coins size={14} className="text-accent" /> Política de Preços
              </p>
              <div className="p-4 rounded-xl border border-accent/20 bg-accent/5">
                <p className="text-xs text-ink-secondary leading-relaxed">
                  Os programas seguem a precificação dinâmica baseada em mérito. Define o valor base e as bolsas de excelência (em breve).
                </p>
              </div>
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
                  setTimeout(() => { navigate('/app/dashboard/instituicao'); }, 3000);
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

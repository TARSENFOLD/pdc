import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CriarExperienciaPayloadSchema, type CriarExperienciaPayload } from '@pdc/shared';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { experienciasApi } from '@/lib/api/experiencias';
import { Input, Select, Button, Spinner } from '@/components/ui';
import { toast } from '@/hooks/useToast';
import { BuilderShell, BuilderSection, BuilderUploadZone, BuilderActionsBar } from '@/components/builders';
import { EcosystemImpactPanel } from '@/components/ecosystem/EcosystemImpactPanel';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/lib/auth/auth-context';

const STORAGE_KEY = 'pdc_builder_experiencia_draft';

function muralPath(index: number, field: 'autor' | 'cargo' | 'depoimento') {
  return ['muralVozes', index, field].join('.') as `muralVozes.${number}.${typeof field}`;
}

function timelinePath(index: number, field: 'ano' | 'foco') {
  return ['guiaInstitucional', 'timelineCurricular', index, field].join('.') as `guiaInstitucional.timelineCurricular.${number}.${typeof field}`;
}

type ApiError = { response?: { data?: { error?: string } }; message?: string };

function getErrorMessage(err: ApiError): string {
  return err.response?.data?.error ?? err.message ?? 'Erro desconhecido';
}

export function CriarExperienciaPage() {
  // BUG-005: detectar modo edição pelo parâmetro :id na URL
  const { id: editId } = useParams<{ id?: string }>();
  const isEditMode = !!editId;

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [lastEventId, setLastEventId] = useState<string | null>(null);

  const form = useForm<CriarExperienciaPayload>({
    resolver: zodResolver(CriarExperienciaPayloadSchema),
    defaultValues: {
      titulo: '',
      descricao: '',
      area: 'SAUDE',
      nivel: 'basico',
      modalidade: 'online',
      painelRealidade: { principaisEmpregadores: [] },
      muralVozes: [],
      guiaInstitucional: { fotosCampus: [], timelineCurricular: [] },
    }
  });

  const { register, control, setValue, watch, formState: { errors } } = form;
  const muralArray = useFieldArray({ control, name: 'muralVozes' });
  const timelineArray = useFieldArray({ control, name: 'guiaInstitucional.timelineCurricular' });

  // BUG-005: carregar dados existentes em modo edição
  const { data: existingExp, isLoading: isLoadingExp } = useQuery({
    queryKey: ['experiencias', editId],
    queryFn: () => experienciasApi.getById(editId ?? ''),
    enabled: isEditMode,
  });

  // BUG-005: hidratar o formulário com os dados carregados
  useEffect(() => {
    if (!existingExp || !isEditMode) return;
    const { titulo, descricao, area, nivel, modalidade, duracaoEstimada, painelRealidade, muralVozes, guiaInstitucional } = existingExp;
    if (titulo) setValue('titulo', titulo);
    if (descricao) setValue('descricao', descricao);
    if (area) setValue('area', area);
    if (nivel) setValue('nivel', nivel);
    if (modalidade) setValue('modalidade', modalidade);
    if (duracaoEstimada != null) setValue('duracaoEstimada', duracaoEstimada);
    if (painelRealidade) setValue('painelRealidade', painelRealidade);
    if (muralVozes) setValue('muralVozes', muralVozes);
    if (guiaInstitucional) setValue('guiaInstitucional', guiaInstitucional);
  }, [existingExp, isEditMode, setValue]);

  // Autosave em localStorage — apenas no modo criação
  useEffect(() => {
    if (isEditMode) return;

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed: unknown = JSON.parse(saved);
        const draft = CriarExperienciaPayloadSchema.partial().safeParse(parsed);
        if (draft.success) {
          const data = draft.data;
          if (data.titulo !== undefined) setValue('titulo', data.titulo);
          if (data.descricao !== undefined) setValue('descricao', data.descricao);
          if (data.area !== undefined) setValue('area', data.area);
          if (data.nivel !== undefined) setValue('nivel', data.nivel);
          if (data.modalidade !== undefined) setValue('modalidade', data.modalidade);
          if (data.painelRealidade !== undefined) setValue('painelRealidade', data.painelRealidade);
          if (data.muralVozes !== undefined) setValue('muralVozes', data.muralVozes);
          if (data.guiaInstitucional !== undefined) setValue('guiaInstitucional', data.guiaInstitucional);
        }
      } catch (e) {
        console.error('Falha ao recuperar draft', e);
      }
    }

    const subscription = watch((value) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    });
    return () => { subscription.unsubscribe(); };
  }, [isEditMode, setValue, watch]);

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: ['experiencias', 'minhas'] });
    if (editId) void queryClient.invalidateQueries({ queryKey: ['experiencias', editId] });
  };

  // BUG-002/003: mutations separadas — cada uma com semântica própria
  const createMutation = useMutation({
    mutationFn: (data: CriarExperienciaPayload) => experienciasApi.create(data),
    onError: (err: ApiError) => toast({ title: 'Falha ao criar', description: getErrorMessage(err), variant: 'error' }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: CriarExperienciaPayload) => experienciasApi.update(editId ?? '', data),
    onError: (err: ApiError) => toast({ title: 'Falha ao atualizar', description: getErrorMessage(err), variant: 'error' }),
  });

  const estadoMutation = useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: string }) =>
      experienciasApi.updateEstado(id, estado),
    onError: () => toast({ title: 'Falha na transição de estado', variant: 'error' }),
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending || estadoMutation.isPending;
  const currentState = existingExp?.estado ?? 'draft';

  // BUG-002: handleSubmit garante validação Zod antes de qualquer mutação
  // BUG-003: três handlers com semânticas distintas

  const handleSaveDraft = () => {
    void form.handleSubmit(async (data) => {
      try {
        if (isEditMode) {
          await updateMutation.mutateAsync(data);
          invalidateAll();
          toast({ title: 'Experiência Atualizada!' });
          navigate('/app/instituicao/experiencias');
        } else {
          const res = await createMutation.mutateAsync(data);
          invalidateAll();
          localStorage.removeItem(STORAGE_KEY);
          toast({ title: 'Experiência Criada!' });
          if (res.eventId) {
            setLastEventId(res.eventId);
          } else {
            navigate('/app/instituicao/experiencias');
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
          targetId = String(res.id);
          localStorage.removeItem(STORAGE_KEY);
        }
        if (targetId) {
          await estadoMutation.mutateAsync({ id: targetId, estado: 'review' });
        }
        invalidateAll();
        toast({ title: 'Submetido para revisão com sucesso.' });
        navigate('/app/instituicao/experiencias');
      } catch {
        // erros tratados pelos onError de cada mutation
      }
    })();
  };

  const handlePublish = () => {
    if (!editId) return;
    void estadoMutation.mutateAsync({ id: editId, estado: 'published' }).then(() => {
      invalidateAll();
      toast({ title: 'Experiência publicada!' });
      navigate('/app/instituicao/experiencias');
    });
  };

  if (isEditMode && isLoadingExp) {
    return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>;
  }

  return (
    <>
      <BuilderShell
        title={isEditMode ? 'Editar Experiência' : 'Gerador de Experiência Premium'}
        description={isEditMode
          ? 'Actualiza os dados da tua experiência curricular.'
          : 'Materializa o impacto da tua instituição através de dados reais e vozes autênticas.'
        }
        state={currentState}
        breadcrumbs={[
          { label: 'Início', to: '/app' },
          // BUG-004: rota corrigida para /app/instituicao/experiencias
          { label: 'Experiências', to: '/app/instituicao/experiencias' },
          { label: isEditMode ? 'Editar' : 'Nova Experiência' }
        ]}
        sections={[
          { id: 'identidade', label: 'Identidade' },
          { id: 'realidade', label: 'Painel de Realidade' },
          { id: 'vozes', label: 'Mural de Vozes' },
          { id: 'guia', label: 'Guia Institucional' },
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
          value="identidade"
          title="Identidade e Contexto"
          description="O que é esta experiência e a quem se destina."
        >
          <div className="space-y-6">
            <Input label="Título da Experiência" {...register('titulo')} error={errors.titulo?.message} />
            <div className="space-y-1">
              <label className="text-sm font-bold uppercase tracking-widest text-ink-tertiary">Descrição Narrativa</label>
              <textarea
                className="flex min-h-[120px] w-full rounded-sm border border-ink-tertiary/20 bg-recessed px-4 py-3 text-sm focus:border-accent outline-none transition-all"
                {...register('descricao')}
              />
              {errors.descricao && <p className="text-xs text-accent-danger">{errors.descricao.message}</p>}
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Select label="Área Vocacional" {...register('area')}>
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
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Duração (horas)"
                  type="number"
                  min={1}
                  max={10000}
                  placeholder="ex: 40"
                  {...register('duracaoEstimada', { valueAsNumber: true })}
                  error={errors.duracaoEstimada?.message}
                />
              </div>
            </div>
          </div>
        </BuilderSection>

        <BuilderSection
          title="Painel de Realidade"
          description="Dados de mercado e empregabilidade (Spec 04)."
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Salário Médio Base" {...register('painelRealidade.salarioMedio')} placeholder="ex: 1.200€ - 1.500€" />
              <Input label="Taxa de Empregabilidade" {...register('painelRealidade.taxaEmpregabilidade')} placeholder="ex: 94%" />
            </div>
            <p className="text-[10px] font-black text-ink-tertiary uppercase tracking-widest">Principais Empregadores</p>
            <div className="p-4 border border-ink-tertiary/10 rounded-xl bg-recessed/30 italic text-sm text-ink-secondary">
              Configuração de marcas parceiras em breve.
            </div>
          </div>
        </BuilderSection>

        <BuilderSection
          title="Mural de Vozes"
          description="Depoimentos reais de quem já viveu a experiência."
        >
          <div className="space-y-6">
            {muralArray.fields.map((field, index) => (
              <div key={field.id} className="p-6 border border-ink-tertiary/10 rounded-2xl bg-canvas space-y-4">
                <Input label="Autor" {...register(muralPath(index, 'autor'))} />
                <Input label="Cargo/Função" {...register(muralPath(index, 'cargo'))} />
                <textarea
                  placeholder="O depoimento..."
                  className="w-full rounded-xl border border-ink-tertiary/10 bg-recessed p-3 text-sm"
                  {...register(muralPath(index, 'depoimento'))}
                />
                <Button variant="ghost" size="sm" className="text-accent-danger" onClick={() => { muralArray.remove(index); }}>Remover Voz</Button>
              </div>
            ))}
            <Button variant="outline" className="w-full" onClick={() => { muralArray.append({ tipo: 'aluno', autor: '', cargo: '', depoimento: '' }); }}>
              + Adicionar Testemunho
            </Button>
          </div>
        </BuilderSection>

        <BuilderSection
          title="Guia Institucional"
          description="Vitrinas do campus e jornada curricular."
        >
          <div className="space-y-8">
            <div>
              <p className="text-[10px] font-black text-ink-tertiary uppercase tracking-widest mb-4">Fotos do Campus / Laboratórios</p>
              <BuilderUploadZone
                multiple
                onUploadComplete={(urls) => {
                  const current = watch('guiaInstitucional.fotosCampus') || [];
                  setValue('guiaInstitucional.fotosCampus', [...current, ...urls]);
                }}
              />
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black text-ink-tertiary uppercase tracking-widest">Timeline Curricular</p>
              {timelineArray.fields.map((field, index) => (
                <div key={field.id} className="flex gap-4 items-end">
                  <Input label="Ano/Fase" {...register(timelinePath(index, 'ano'))} />
                  <Input label="Foco Principal" {...register(timelinePath(index, 'foco'))} className="flex-1" />
                  <Button variant="ghost" onClick={() => { timelineArray.remove(index); }}>X</Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => { timelineArray.append({ ano: '', foco: '' }); }}>+ Adicionar Fase</Button>
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
                  setTimeout(() => { navigate('/app/instituicao/experiencias'); }, 3000);
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

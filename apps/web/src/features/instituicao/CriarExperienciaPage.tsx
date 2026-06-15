import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CriarExperienciaPayloadSchema,
  parsePainelRealidade,
  type CriarExperienciaPayload,
} from '@pdc/shared';
import { useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { experienciasApi } from '@/lib/api/experiencias';
import { Spinner } from '@/components/ui';
import { toast } from '@/hooks/useToast';
import { RichBuilderShell, BuilderSection, BuilderActionsBar } from '@/components/builders';
import { useAuth } from '@/lib/auth/auth-context';
import { ExperienceSectionsBuilder } from './components/ExperienceSectionsBuilder';
import { ExperienceIdentityFields } from './components/ExperienceIdentityFields';
import { ExperienceCanonicalPanelsEditor } from './components/ExperienceCanonicalPanelsEditor';
import { newExperienceSection } from './components/experience-section-factory';
import { getErrorBody } from '@/lib/api/http';

const STORAGE_KEY = 'pdc_builder_experiencia_draft';

function getErrorMessage(err: unknown): string {
  return getErrorBody(err)?.error ?? (err instanceof Error ? err.message : 'Erro desconhecido');
}

export function CriarExperienciaPage() {
  // BUG-005: detectar modo edição pelo parâmetro :id na URL
  const { id: editId } = useParams<{ id?: string }>();
  const isEditMode = !!editId;

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isEditingModule, setIsEditingModule] = useState(false);

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
      secoes: [
        newExperienceSection('boas_vindas', 0, 'Boas-vindas'),
        newExperienceSection('realidade', 1, 'Realidade da área'),
        newExperienceSection('curriculo', 2, 'Percurso e currículo'),
        newExperienceSection('depoimentos', 3, 'Vozes da comunidade'),
        newExperienceSection('infraestrutura', 4, 'Infraestrutura'),
        newExperienceSection('proximos_passos', 5, 'Próximos passos'),
      ],
    }
  });

  const { register, control, setValue, watch, formState: { errors } } = form;
  // BUG-005: carregar dados existentes em modo edição
  const { data: existingExp, isLoading: isLoadingExp } = useQuery({
    queryKey: ['experiencias', editId],
    queryFn: () => experienciasApi.getMineById(editId ?? ''),
    enabled: isEditMode,
  });

  // BUG-005: hidratar o formulário com os dados carregados
  useEffect(() => {
    if (!existingExp || !isEditMode) return;
    const { titulo, descricao, area, nivel, modalidade, duracaoEstimada, painelRealidade, muralVozes, guiaInstitucional, secoes } = existingExp;
    if (titulo) setValue('titulo', titulo);
    if (descricao) setValue('descricao', descricao);
    if (area) setValue('area', area);
    if (nivel) setValue('nivel', nivel);
    if (modalidade) setValue('modalidade', modalidade);
    if (duracaoEstimada != null) setValue('duracaoEstimada', duracaoEstimada);
    if (painelRealidade) setValue('painelRealidade', parsePainelRealidade(painelRealidade));
    if (muralVozes) setValue('muralVozes', muralVozes);
    if (guiaInstitucional) setValue('guiaInstitucional', guiaInstitucional);
    if (secoes) setValue('secoes', secoes);
  }, [existingExp, isEditMode, setValue]);

  // Autosave em localStorage — apenas no modo criação
  useEffect(() => {
    if (isEditMode) return;

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed: unknown = JSON.parse(saved);
        const migrated = typeof parsed === 'object' && parsed !== null && 'painelRealidade' in parsed && parsed.painelRealidade
          ? { ...parsed, painelRealidade: parsePainelRealidade(parsed.painelRealidade) }
          : parsed;
        const draft = CriarExperienciaPayloadSchema.partial().safeParse(migrated);
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
          if (data.secoes !== undefined) setValue('secoes', data.secoes);
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
    onError: (err: unknown) => toast({ title: 'Falha ao criar', description: getErrorMessage(err), variant: 'error' }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: CriarExperienciaPayload) => experienciasApi.update(editId ?? '', data),
    onError: (err: unknown) => toast({ title: 'Falha ao atualizar', description: getErrorMessage(err), variant: 'error' }),
  });

  const estadoMutation = useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: string }) =>
      experienciasApi.updateEstado(id, estado),
    onError: () => toast({ title: 'Falha na transição de estado', variant: 'error' }),
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending || estadoMutation.isPending;
  const currentState = existingExp?.estado ?? 'draft';
  const showValidationErrors = (validationErrors: FieldErrors<CriarExperienciaPayload>) => {
    toast({
      title: 'Revê os campos da experiência',
      description: `Campos inválidos: ${Object.keys(validationErrors).join(', ')}`,
      variant: 'error',
    });
  };

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
          await createMutation.mutateAsync(data);
          invalidateAll();
          localStorage.removeItem(STORAGE_KEY);
          toast({ title: 'Rascunho guardado.' });
          navigate('/app/instituicao/experiencias');
        }
      } catch {
        // erros tratados pelos onError de cada mutation
      }
    }, showValidationErrors)();
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
    }, showValidationErrors)();
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
      <RichBuilderShell
        title={isEditMode ? 'Editar experiência' : 'Criar experiência'}
        description={isEditMode
          ? 'Actualiza os dados da tua experiência curricular.'
          : 'Apresenta o curso, o mercado, as pessoas e a vida na instituição de forma clara.'
        }
        steps={[
          { id: 'identidade', label: 'Dados principais', description: 'Identidade e contexto' },
          { id: 'estrutura', label: 'Storytelling', description: 'Seções da experiência' },
          { id: 'realidade', label: 'Realidade', description: 'Mercado em Angola' },
          { id: 'vozes', label: 'Vozes', description: 'Depoimentos reais' },
          { id: 'guia', label: 'Instituição', description: 'Campus e percurso' },
        ]}
        settingsPanel={(
          <div className="space-y-7">
            <div>
              <p className="text-xs font-semibold uppercase text-accent">Acesso</p>
              <h3 className="mt-2 text-base font-semibold text-ink-primary">Sempre gratuita</h3>
              <p className="mt-2 text-sm leading-6 text-ink-secondary">
                Experiências são conteúdos institucionais de orientação e não podem ser monetizadas.
              </p>
            </div>
            {!isEditingModule && (
              <BuilderActionsBar
                state={currentState}
                userRole={user?.role || 'instituicao'}
                onSaveDraft={handleSaveDraft}
                onSubmitReview={handleSubmitReview}
                onPublish={handlePublish}
                isSubmitting={isSubmitting}
              />
            )}
          </div>
        )}
      >
        <BuilderSection
          value="identidade"
          title="Identidade e Contexto"
          description="O que é esta experiência e a quem se destina."
        >
          <ExperienceIdentityFields register={register} errors={errors} />
        </BuilderSection>

        <BuilderSection
          value="estrutura"
          title="Módulos da Experiência"
          description="Escolhe, ordena e combina seções de storytelling. Estes módulos não são unidades pedagógicas de Curso."
        >
          <ExperienceSectionsBuilder
            control={control}
            register={register}
            watch={watch}
            setValue={setValue}
            onEditingChange={setIsEditingModule}
          />
        </BuilderSection>

        <BuilderSection
          value="realidade"
          title="Painel de Realidade"
          description="Dados de mercado e empregabilidade (Spec 04)."
        >
          <ExperienceCanonicalPanelsEditor panel="realidade" control={control} register={register} watch={watch} setValue={setValue} />
        </BuilderSection>

        <BuilderSection
          value="vozes"
          title="Mural de Vozes"
          description="Depoimentos reais de quem já viveu a experiência."
        >
          <ExperienceCanonicalPanelsEditor panel="vozes" control={control} register={register} watch={watch} setValue={setValue} />
        </BuilderSection>

        <BuilderSection
          value="guia"
          title="Guia Institucional"
          description="Vitrinas do campus e jornada curricular."
        >
          <ExperienceCanonicalPanelsEditor panel="guia" control={control} register={register} watch={watch} setValue={setValue} />
        </BuilderSection>
      </RichBuilderShell>

    </>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CriarProgramaPayloadSchema, type CriarProgramaPayload, type Programa } from '@pdc/shared';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { programasApi } from '@/lib/api/programas';
import { Spinner } from '@/components/ui';
import { toast } from '@/hooks/useToast';
import { BuilderShell, BuilderActionsBar } from '@/components/builders';
import { EcosystemImpactPanel } from '@/components/ecosystem/EcosystemImpactPanel';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/lib/auth/auth-context';
import ProgramaFormSections from './programas/ProgramaFormSections';

type ApiError = { response?: { data?: { error?: string } }; message?: string };

function getErrorMessage(err: ApiError): string {
  return err.response?.data?.error ?? err.message ?? 'Erro desconhecido';
}

const PROGRAMA_FIELD_LABELS: Record<string, string> = {
  titulo: 'Título',
  proposito: 'Propósito',
  metodologia: 'Metodologia',
  area: 'Área',
  tipo: 'Tipo',
  modalidade: 'Modalidade',
  vagas: 'Vagas',
  cursosIds: 'Cursos',
  experienciasIds: 'Experiências',
  simulacoesIds: 'Simulações',
  projetosIds: 'Projetos',
  recursos: 'Recursos',
  precoPolicy: 'Modelo de acesso',
};

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
      recursos: {
        materiais: [],
        infraestrutura: [],
        equipa: [],
      },
      precoPolicy: {
        modo: 'gratuito',
        valor: 0,
        moeda: 'AOA',
        bolsasDisponiveis: false,
      },
    }
  });

  const { setValue } = form;

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
    setValue('cursosIds', p.cursosIds ?? []);
    setValue('experienciasIds', p.experienciasIds ?? []);
    setValue('simulacoesIds', p.simulacoesIds ?? []);
    setValue('projetosIds', p.projetosIds ?? []);
    setValue('recursos', p.recursos ?? { materiais: [], infraestrutura: [], equipa: [] });
    setValue('precoPolicy', p.precoPolicy ?? {
      modo: 'gratuito',
      valor: 0,
      moeda: 'AOA',
      bolsasDisponiveis: false,
    });
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
  const showValidationErrors = (errors: typeof form.formState.errors) => {
    const invalidFields = Object.keys(errors).map((field) => PROGRAMA_FIELD_LABELS[field] ?? field);
    toast({
      title: 'Revê os campos do programa',
      description: `Campos inválidos: ${invalidFields.join(', ')}`,
      variant: 'error',
    });
  };

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
    }, showValidationErrors)();
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
        title={isEditMode ? 'Editar programa' : 'Criar programa'}
        description={isEditMode
          ? 'Actualiza os dados do programa de acesso ao ecossistema.'
          : 'Define o objetivo, a metodologia, os conteúdos e as regras de inscrição.'
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
        <ProgramaFormSections form={form} />
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

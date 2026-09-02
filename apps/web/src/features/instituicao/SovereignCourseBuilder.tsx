import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CriarCursoPayloadSchema } from '@pdc/shared';
import type { z } from 'zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cursosApi } from '@/lib/api/cursos';
import { toast } from '@/hooks/useToast';
import { CourseBaseInfo } from './components/CourseBaseInfo';
import { CourseMeritGuard } from './components/CourseMeritGuard';
import { CourseCurriculum } from './components/CourseCurriculum';
import { CourseSettingsPanel } from './components/CourseSettingsPanel';
import { CourseReviewPanel } from './components/CourseReviewPanel';
import { RichBuilderShell, BuilderSection, BuilderActionsBar } from '@/components/builders';
import { useAuth } from '@/lib/auth/auth-context';
import { Spinner } from '@/components/ui';

type FormValues = z.infer<typeof CriarCursoPayloadSchema>;
type EditableCursoState = NonNullable<FormValues['estado']>;
type CursoVisibilidade = NonNullable<FormValues['visibilidade']>;

function toEditableState(state: string | undefined): EditableCursoState | undefined {
  return state === 'draft' || state === 'review' || state === 'published' ? state : undefined;
}

function resolveCursoVisibilidade(curso: unknown): CursoVisibilidade {
  if (!curso || typeof curso !== 'object' || !('visibilidade' in curso)) return 'publico';
  const value = (curso as Record<string, unknown>).visibilidade;
  return value === 'publico' || value === 'privado' || value === 'institucional'
    ? value
    : 'publico';
}

export function SovereignCourseBuilder() {
  const navigate = useNavigate();
  const { id: cursoId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isEditing = Boolean(cursoId);

  const form = useForm<FormValues>({
    resolver: zodResolver(CriarCursoPayloadSchema) as never,
    defaultValues: {
      titulo: '',
      descricao: '',
      area: 'TECNOLOGIA',
      nivel: 'medio',
      visibilidade: 'publico',
      gratuito: true,
      preco: 0,
      moeda: 'AOA',
      regrasAcesso: { minFluidez: 0, minResiliencia: 0, minFoco: 0 },
      modulos: [{ titulo: 'Módulo 1: Introdução', ordem: 1, itens: [{ titulo: 'Bem-vindo', tipo: 'texto', ordem: 1 }] }]
    }
  });

  const { register, control, watch, setValue, handleSubmit, formState: { errors } } = form;
  const modulosArray = useFieldArray({ control, name: 'modulos' });
  const cursoQuery = useQuery({
    queryKey: ['cursos', cursoId ?? ''],
    queryFn: () => cursosApi.getPreviewById(cursoId ?? ''),
    enabled: isEditing,
  });

  useEffect(() => {
    const curso = cursoQuery.data;
    if (!curso) return;

    form.reset({
      titulo: curso.titulo,
      descricao: curso.descricao,
      area: curso.area ?? 'TECNOLOGIA',
      nivel: curso.nivel === 'basico' || curso.nivel === 'medio' || curso.nivel === 'avancado' ? curso.nivel : 'medio',
      capaUrl: curso.capaUrl ?? undefined,
      visibilidade: resolveCursoVisibilidade(curso),
      gratuito: curso.gratuito ?? true,
      preco: curso.preco ?? 0,
      moeda: curso.moeda ?? 'AOA',
      estado: toEditableState(curso.estado),
      regrasAcesso: {
        minFluidez: curso.regrasAcesso?.minFluidez ?? 0,
        minResiliencia: curso.regrasAcesso?.minResiliencia ?? 0,
        minFoco: curso.regrasAcesso?.minFoco ?? 0,
      },
      modulos: curso.modulos?.length
        ? curso.modulos.map((modulo, moduloIndex) => ({
          persistedId: modulo.id,
          titulo: modulo.titulo,
          ordem: modulo.ordem || moduloIndex + 1,
          itens: modulo.itens.map((item, itemIndex) => ({
            persistedId: item.id,
            titulo: item.titulo,
            tipo: item.tipo,
            conteudo: item.conteudo ?? undefined,
            url: item.url ?? undefined,
            ordem: item.ordem || itemIndex + 1,
          })),
        }))
        : [{ titulo: 'Módulo 1: Introdução', ordem: 1, itens: [{ titulo: 'Bem-vindo', tipo: 'texto', ordem: 1 }] }],
    });
  }, [cursoQuery.data, form]);

  const mutation = useMutation({
    mutationFn: (data: FormValues) => isEditing && cursoId
      ? cursosApi.update(cursoId, data)
      : cursosApi.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cursos', 'meus'] });
      toast({ title: 'Curso guardado com sucesso.' });
      navigate(user?.role === 'mentor' ? '/app/mentor/cursos' : '/app/dashboard/instituicao');
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      toast({
        title: 'Falha ao guardar',
        description: message,
        variant: 'error'
      });
    }
  });

  const estadoMutation = useMutation({
    mutationFn: (estado: 'draft' | 'review' | 'published' | 'archived') =>
      cursosApi.updateEstado(cursoId ?? '', estado),
    onSuccess: (_, estado) => {
      void queryClient.invalidateQueries({ queryKey: ['cursos', cursoId ?? ''] });
      void queryClient.invalidateQueries({ queryKey: ['cursos', 'meus'] });
      toast({ title: estado === 'published' ? 'Curso publicado!' : 'Estado atualizado.' });
      navigate(user?.role === 'mentor' ? '/app/mentor/cursos' : '/app/dashboard/instituicao');
    },
    onError: () => { toast({ title: 'Falha na transição de estado', variant: 'error' }); },
  });

  const handlePublish = () => {
    if (!cursoId) return;
    estadoMutation.mutate('published');
  };

  const coursesPath = user?.role === 'mentor' ? '/app/mentor/cursos' : '/app/instituicao/cursos';

  const submitWithState = (estado: FormValues['estado']) => {
    void handleSubmit((data) => {
      mutation.mutate({ ...data, estado });
    }, (validationErrors) => {
      toast({
        title: 'Revê os campos do curso',
        description: `Campos inválidos: ${Object.keys(validationErrors).join(', ')}`,
        variant: 'error',
      });
    })();
  };

  if (isEditing && cursoQuery.isLoading) {
    return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>;
  }

  return (
  <>
    <form onSubmit={(event) => { event.preventDefault(); }}>
      <RichBuilderShell
        title={isEditing ? 'Editar curso' : 'Criar curso'}
        backTo={coursesPath}
        steps={[
          { id: 'info', label: 'Básico', description: 'Identidade do curso' },
          { id: 'curriculum', label: 'Currículo', description: 'Módulos e conteúdos' },
          { id: 'merit', label: 'Acesso', description: 'Público e requisitos' },
          { id: 'review', label: 'Revisão', description: 'Verificar e submeter' },
        ]}
        actions={(
          <span className="rounded-full border border-[var(--chrome-border)] bg-recessed px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-secondary">
            {!isEditing
              ? 'Ainda não guardado'
              : cursoQuery.data?.estado === 'review'
                ? 'Em revisão'
                : cursoQuery.data?.estado === 'published'
                  ? 'Publicado'
                  : 'Rascunho'}
          </span>
        )}
        settingsPanel={(
          <div className="space-y-8">
            <CourseSettingsPanel
              register={register}
              watch={watch}
              setValue={setValue}
              errors={errors}
            />
            <BuilderActionsBar
              state={cursoQuery.data?.estado ?? 'draft'}
              userRole={user?.role || 'instituicao'}
              onSaveDraft={() => { submitWithState('draft'); }}
              onSubmitReview={() => { submitWithState('review'); }}
              onPublish={handlePublish}
              isSubmitting={mutation.isPending || estadoMutation.isPending}
            />
          </div>
        )}
      >
        <BuilderSection
          value="info"
          title="Informação do curso"
          description="Define o título, a descrição, a área vocacional e o nível."
        >
          <CourseBaseInfo register={register} errors={errors} />
        </BuilderSection>

        <BuilderSection
          value="merit"
          title="Acesso e recomendações"
          description="Define a preparação recomendada para iniciar o curso. A visibilidade e o preço ficam sempre acessíveis no painel lateral."
        >
          <CourseMeritGuard register={register} watch={watch} />
        </BuilderSection>

        <BuilderSection
          value="curriculum"
          title="Currículo"
          description="Organiza módulos e itens na ordem em que serão consumidos."
        >
          <CourseCurriculum register={register} control={control} setValue={setValue} modulosArray={modulosArray} />
        </BuilderSection>

        <BuilderSection
          value="review"
          title="Rever antes de submeter"
          description="Confirma o essencial do curso e regressa diretamente a qualquer etapa incompleta."
        >
          <CourseReviewPanel control={control} errors={errors} />
        </BuilderSection>
      </RichBuilderShell>
    </form>

    </>
  );
}

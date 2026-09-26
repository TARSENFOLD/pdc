import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  avaliarProntidaoCurso,
  CriarCursoPayloadSchema,
  type CursoMeu,
  type CursoReadinessStep,
  type Pagination,
} from '@pdc/shared';
import { useForm, useFieldArray, useWatch, type FieldErrors } from 'react-hook-form';
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
import { CourseStepReadiness } from './components/CourseStepReadiness';
import { getCourseCreatorPaths } from '@/features/cursos/course-routes';
import {
  cumulativeCompletedReadinessSteps,
  findBlockingReadinessStep,
} from './components/course-studio/course-readiness-navigation';
import {
  CourseDraftSubmissionError,
  saveAndSubmitCourse,
  toCourseUpdatePayload,
} from './components/course-studio/course-editorial-submit';
import {
  COURSE_BUILDER_STEPS,
  COURSE_FORM_DEFAULTS,
  COURSE_READINESS_STEPS,
  courseEditorialStatusLabel,
  courseFieldLabel,
  courseToFormValues,
  firstCourseFormErrorMessage,
  type CourseFormValues,
} from './components/course-studio/course-builder-config';
type FormValues = CourseFormValues;

interface CreatorCoursesCache {
  data: CursoMeu[];
  pagination: Pagination;
}

function cacheSavedCourse(
  current: CreatorCoursesCache | undefined,
  savedCourse: CursoMeu,
  isNewCourse: boolean
): CreatorCoursesCache | undefined {
  const normalizedCourse = { ...savedCourse, id: String(savedCourse.id) };
  const previousData = current?.data ?? [];
  const existed = previousData.some((course) => String(course.id) === normalizedCourse.id);
  if (!isNewCourse && !existed) return current;
  const pageSize = current?.pagination.pageSize ?? 25;
  const data = [
    normalizedCourse,
    ...previousData.filter((course) => String(course.id) !== normalizedCourse.id),
  ].slice(0, pageSize);
  const total = (current?.pagination.total ?? 0) + (isNewCourse && !existed ? 1 : 0);

  return {
    data,
    pagination: {
      page: 1,
      pageSize,
      total,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export function SovereignCourseBuilder() {
  const navigate = useNavigate();
  const { id: cursoId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isEditing = Boolean(cursoId);
  const coursePaths = getCourseCreatorPaths(user?.role);
  const [activeStep, setActiveStep] = useState<string>('info');
  const form = useForm<FormValues>({
    resolver: zodResolver(CriarCursoPayloadSchema),
    defaultValues: COURSE_FORM_DEFAULTS,
  });
  const {
    register,
    control,
    watch,
    setValue,
    trigger,
    handleSubmit,
    formState: { errors },
  } = form;
  const titulo = useWatch({ control, name: 'titulo' });
  const descricao = useWatch({ control, name: 'descricao' });
  const area = useWatch({ control, name: 'area' });
  const nivel = useWatch({ control, name: 'nivel' });
  const capaUrl = useWatch({ control, name: 'capaUrl' });
  const visibilidade = useWatch({ control, name: 'visibilidade' });
  const gratuito = useWatch({ control, name: 'gratuito' });
  const preco = useWatch({ control, name: 'preco' });
  const moeda = useWatch({ control, name: 'moeda' });
  const modulos = useWatch({ control, name: 'modulos' });
  const readiness = useMemo(
    () =>
      avaliarProntidaoCurso(
        {
          titulo,
          descricao,
          area,
          nivel,
          capaUrl,
          visibilidade,
          gratuito,
          preco,
          moeda,
          modulos,
        },
        { allowLocalHttp: import.meta.env.DEV }
      ),
    [titulo, descricao, area, nivel, capaUrl, visibilidade, gratuito, preco, moeda, modulos]
  );
  const modulosArray = useFieldArray({ control, name: 'modulos' });
  const cursoQuery = useQuery({
    queryKey: ['cursos', cursoId ?? ''],
    queryFn: () => cursosApi.getPreviewById(cursoId ?? ''),
    enabled: isEditing,
  });

  useEffect(() => {
    const curso = cursoQuery.data;
    if (!curso) return;
    form.reset(courseToFormValues(curso));
  }, [cursoQuery.data, form]);

  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      isEditing && cursoId
        ? cursosApi.update(cursoId, toCourseUpdatePayload(data))
        : cursosApi.create({ ...data, estado: 'draft' }),
    onSuccess: (savedCourse) => {
      const savedCourseId = String(savedCourse.id);
      queryClient.setQueryData<CreatorCoursesCache>(['cursos', 'meus'], (current) =>
        cacheSavedCourse(current, savedCourse, !isEditing)
      );
      void queryClient.invalidateQueries({ queryKey: ['cursos', 'meus'] });
      if (isEditing && cursoId) {
        void queryClient.invalidateQueries({ queryKey: ['cursos', cursoId] });
      } else {
        navigate(`${coursePaths.editor}/${savedCourseId}/editar`, { replace: true });
      }
      toast({
        title: 'Rascunho guardado.',
        description: 'Podes continuar a editar o curso.',
      });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      toast({
        title: 'Falha ao guardar',
        description: message,
        variant: 'error',
      });
    },
  });

  const estadoMutation = useMutation({
    mutationFn: async ({ estado, data }: { estado: 'review' | 'published'; data: FormValues }) => {
      if (estado === 'review') {
        return saveAndSubmitCourse({
          api: cursosApi,
          payload: data,
          ...(cursoId ? { courseId: cursoId } : {}),
        });
      }
      if (!cursoId) throw new Error('Guarda primeiro o curso como rascunho.');
      await cursosApi.update(cursoId, toCourseUpdatePayload(data));
      await cursosApi.updateEstado(cursoId, estado);
      return cursoId;
    },
    onSuccess: (savedCourseId, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['cursos', savedCourseId] });
      void queryClient.invalidateQueries({ queryKey: ['cursos', 'meus'] });
      toast({
        title:
          variables.estado === 'published' ? 'Curso publicado!' : 'Curso submetido para revisão.',
      });
      navigate(coursePaths.library);
    },
    onError: (err: unknown) => {
      if (err instanceof CourseDraftSubmissionError) {
        toast({ title: err.message, description: err.reason, variant: 'error' });
        navigate(`${coursePaths.editor}/${err.draftId}/editar`);
        return;
      }
      toast({
        title: 'Falha na transição de estado',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'error',
      });
    },
  });

  const firstIncompleteStep = COURSE_READINESS_STEPS.find(
    (step) => !readiness.byStep[step].complete
  );
  const completedSteps = cumulativeCompletedReadinessSteps(COURSE_READINESS_STEPS, readiness);

  const showIncompleteStep = (step: CursoReadinessStep) => {
    setActiveStep(step);
    const firstIssue = readiness.byStep[step].issues[0];
    toast({
      title: 'Completa esta etapa para continuar',
      ...(firstIssue ? { description: firstIssue.message } : {}),
      variant: 'error',
    });
    if (step === 'info') void trigger(['titulo', 'descricao', 'capaUrl']);
    if (step === 'curriculum') void trigger('modulos');
    if (step === 'merit') void trigger(['visibilidade', 'gratuito', 'preco', 'moeda']);
  };

  const handleStepChange = (targetStep: string) => {
    const targetIndex = COURSE_BUILDER_STEPS.findIndex((step) => step.id === targetStep);
    if (targetIndex < 0) return;
    const blockingStep = findBlockingReadinessStep({
      activeStep,
      targetStep,
      steps: COURSE_BUILDER_STEPS,
      readinessSteps: COURSE_READINESS_STEPS,
      readiness,
    });
    if (blockingStep) {
      showIncompleteStep(blockingStep);
      return;
    }
    setActiveStep(targetStep);
  };

  const showFormErrors = (validationErrors: FieldErrors<FormValues>) => {
    const invalidLabels = Object.keys(validationErrors).map(courseFieldLabel);
    const specificMessage = firstCourseFormErrorMessage(validationErrors);
    toast({
      title: 'Revê os campos do curso',
      description: specificMessage ?? `Verifica: ${[...new Set(invalidLabels)].join(', ')}.`,
      variant: 'error',
    });
  };

  const transitionWhenReady = (estado: 'review' | 'published') => {
    if (!readiness.ready) {
      if (firstIncompleteStep) showIncompleteStep(firstIncompleteStep);
      return;
    }
    if (estado === 'published' && !cursoId) {
      toast({ title: 'Guarda primeiro o curso como rascunho.', variant: 'error' });
      return;
    }
    void handleSubmit((data) => {
      estadoMutation.mutate({ estado, data });
    }, showFormErrors)();
  };

  const saveDraft = () => {
    void handleSubmit((data) => {
      mutation.mutate(data);
    }, showFormErrors)();
  };

  if (isEditing && cursoQuery.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <RichBuilderShell
        title={isEditing ? 'Editar curso' : 'Criar curso'}
        backTo={coursePaths.library}
        steps={COURSE_BUILDER_STEPS.map((step) => ({ ...step }))}
        activeStep={activeStep}
        onStepChange={handleStepChange}
        completedSteps={completedSteps}
        actions={
          <span className="bg-recessed text-ink-secondary rounded-full border border-[var(--chrome-border)] px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase">
            {courseEditorialStatusLabel(isEditing, cursoQuery.data?.estado)}
          </span>
        }
        settingsPanel={
          <div className="space-y-8">
            <CourseSettingsPanel
              register={register}
              watch={watch}
              setValue={setValue}
              errors={errors}
              coverRequired={!readiness.byStep.info.complete}
            />
            <BuilderActionsBar
              state={cursoQuery.data?.estado ?? 'draft'}
              userRole={user?.role || 'instituicao'}
              onSaveDraft={() => {
                saveDraft();
              }}
              onSubmitReview={() => {
                transitionWhenReady('review');
              }}
              submitReviewLabel={
                isEditing ? 'Submeter para revisão' : 'Guardar e submeter para revisão'
              }
              onPublish={() => {
                transitionWhenReady('published');
              }}
              isSubmitting={mutation.isPending || estadoMutation.isPending}
              isReady={readiness.ready}
              pendingRequirements={readiness.issues.length}
              onResolveRequirements={() => {
                if (firstIncompleteStep) showIncompleteStep(firstIncompleteStep);
              }}
            />
          </div>
        }
      >
        <BuilderSection
          value="info"
          title="Informação do curso"
          description="Define o título, a descrição, a área vocacional e o nível."
        >
          <CourseBaseInfo control={control} register={register} errors={errors} />
          <CourseStepReadiness step="info" readiness={readiness} />
        </BuilderSection>
        <BuilderSection
          value="merit"
          title="Acesso e recomendações"
          description="Define a preparação recomendada para iniciar o curso. A visibilidade e o preço ficam sempre acessíveis no painel lateral."
        >
          <CourseMeritGuard register={register} watch={watch} />
          <CourseStepReadiness step="merit" readiness={readiness} />
        </BuilderSection>

        <BuilderSection
          value="curriculum"
          title="Currículo"
          description="Organiza módulos e itens na ordem em que serão consumidos."
        >
          <CourseCurriculum
            register={register}
            control={control}
            setValue={setValue}
            trigger={trigger}
            modulosArray={modulosArray}
          />
          <CourseStepReadiness step="curriculum" readiness={readiness} />
        </BuilderSection>

        <BuilderSection
          value="review"
          title="Rever antes de submeter"
          description="Confirma o essencial do curso e regressa diretamente a qualquer etapa incompleta."
        >
          <CourseReviewPanel
            values={{ titulo, area, nivel, modulos }}
            readiness={readiness}
            onResolve={showIncompleteStep}
            {...((cursoQuery.data?.estado ?? 'draft') === 'draft'
              ? {
                  submitLabel: isEditing
                    ? 'Submeter para revisão'
                    : 'Guardar e submeter para revisão',
                  onSubmit: () => {
                    transitionWhenReady('review');
                  },
                  submitDisabled:
                    !readiness.ready || mutation.isPending || estadoMutation.isPending,
                }
              : {})}
          />
        </BuilderSection>
      </RichBuilderShell>
    </form>
  );
}

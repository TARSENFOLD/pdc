import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CriarCursoPayloadSchema, type MutationResult } from '@pdc/shared';
import type { z } from 'zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { http } from '@/lib/api/http';
import { toast } from '@/hooks/useToast';
import { CourseBaseInfo } from './components/CourseBaseInfo';
import { CourseMeritGuard } from './components/CourseMeritGuard';
import { CourseCurriculum } from './components/CourseCurriculum';
import { BuilderShell, BuilderSection, BuilderActionsBar } from '@/components/builders';
import { EcosystemImpactPanel } from '@/components/ecosystem/EcosystemImpactPanel';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/lib/auth/auth-context';

type FormValues = z.infer<typeof CriarCursoPayloadSchema>;

export function SovereignCourseBuilder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [lastEventId, setLastEventId] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(CriarCursoPayloadSchema) as never,
    defaultValues: {
      titulo: '',
      descricao: '',
      area: 'TECNOLOGIA',
      nivel: 'medio',
      visibilidade: 'publico',
      regrasAcesso: { minFluidez: 0, minResiliencia: 0, minFoco: 0 },
      modulos: [{ titulo: 'Módulo 1: Introdução', ordem: 1, itens: [{ titulo: 'Bem-vindo', tipo: 'texto', ordem: 1 }] }]
    }
  });

  const { register, control, watch, setValue, formState: { errors } } = form;
  const modulosArray = useFieldArray({ control, name: 'modulos' });

  const mutation = useMutation({
    mutationFn: (data: FormValues) => http.post('/cursos', data),
    onSuccess: (res) => {
      const result = res as MutationResult;
      void queryClient.invalidateQueries({ queryKey: ['cursos', 'meus'] });
      toast({ title: 'Curso Soberano Materializado!', description: 'O impacto no ecossistema foi disparado.' });
      
      if (result.eventId) {
        setLastEventId(result.eventId);
      } else {
        navigate('/app/dashboard/instituicao');
      }
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      toast({ 
        title: 'Falha na Materialização', 
        description: message,
        variant: 'error' 
      });
    }
  });

  const handleSave = () => {
    const data = form.getValues();
    mutation.mutate(data);
  };

  return (
  <>
    <BuilderShell
      title="Sovereign Course Builder"
      description="Define o currículo, impõe as regras de mérito e domina o ecossistema."        state="draft"      breadcrumbs={[
        { label: 'Início', to: '/app' },
        { label: 'Cursos', to: '/app/mentor/cursos' },
        { label: 'Novo Curso' }
      ]}
      sections={[
        { id: 'info', label: 'Identidade' },
        { id: 'merit', label: 'Regras de Mérito' },
        { id: 'curriculum', label: 'Currículo Soberano' },
      ]}
      actions={
        <BuilderActionsBar
          state="draft"
          userRole={user?.role || 'instituicao'}
          onSaveDraft={handleSave}
          onSubmitReview={handleSave}
          onPublish={handleSave}
          isSubmitting={mutation.isPending}
        />
      }
    >
      <BuilderSection
        value="info"
        title="Identidade do Curso"
        description="Título, descrição e capa do conteúdo pedagógico."
      >
        <CourseBaseInfo 
          register={register} 
          errors={errors} 
          onCapaUploaded={(url) => { setValue('capaUrl', url); }} 
        />
      </BuilderSection>

      <BuilderSection
        title="Regras de Mérito"
        description="Define os pré-requisitos biomecânicos para aceder ao curso."
      >
        <CourseMeritGuard register={register} watch={watch} />
      </BuilderSection>

      <BuilderSection
        value="curriculum"
        title="Currículo Soberano"
        description="Estrutura de módulos e itens de aprendizagem."
      >
        <CourseCurriculum register={register} modulosArray={modulosArray} />
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

import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CriarCursoPayloadSchema, type CriarCursoPayload } from '@pdc/shared';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { http } from '@/lib/api/http';
import { Button, Badge } from '@/components/ui';
import { toast } from '@/hooks/useToast';
import { CourseBaseInfo } from './components/CourseBaseInfo';
import { CourseMeritGuard } from './components/CourseMeritGuard';
import { CourseCurriculum } from './components/CourseCurriculum';

export function SovereignCourseBuilder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<CriarCursoPayload>({
    resolver: zodResolver(CriarCursoPayloadSchema),
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

  const modulosArray = useFieldArray({ control, name: 'modulos' });

  const mutation = useMutation({
    mutationFn: (data: CriarCursoPayload) => http.post('/cursos', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cursos', 'meus'] });
      toast({ title: 'Curso Soberano Materializado!', description: 'O impacto no ecossistema foi disparado.' });
      navigate('/app/dashboard/instituicao');
    },
    onError: (err: any) => toast({ 
      title: 'Falha na Materialização', 
      description: err.response?.data?.error || 'Erro desconhecido',
      variant: 'error' 
    })
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-12 text-center">
        <Badge variant="warning" className="mb-4">E2E G15 Architecture</Badge>
        <h1 className="text-4xl font-black text-text-primary tracking-tight uppercase">Course Sovereign Builder</h1>
        <p className="text-text-secondary mt-2">Define o currículo, impõe as regras de mérito e domina o ecossistema.</p>
      </header>

      <form onSubmit={(e) => void handleSubmit((data) => mutation.mutate(data))(e)} className="space-y-8">
        
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <CourseBaseInfo 
              register={register} 
              errors={errors} 
              onCapaUploaded={(url) => setValue('capaUrl', url)} 
            />
          </div>
          <div className="lg:col-span-1">
            <CourseMeritGuard register={register} watch={watch} />
          </div>
        </section>

        <CourseCurriculum register={register} modulosArray={modulosArray} />

        <footer className="pt-12 border-t border-white/5 flex justify-end gap-4">
           <Button type="button" variant="ghost" onClick={() => navigate(-1)}>Abortar Missão</Button>
           <Button type="submit" size="lg" className="px-12 bg-accent hover:bg-accent-hover text-white shadow-xl shadow-accent/20" disabled={mutation.isPending}>
             {mutation.isPending ? 'A Materializar...' : 'Publicar e Injetar no Ecossistema'}
           </Button>
        </footer>
      </form>
    </div>
  );
}

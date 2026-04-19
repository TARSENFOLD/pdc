import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { CriarCursoPayloadSchema, type CriarCursoPayload } from '@pdc/shared';
import { cursosApi } from '@/lib/api/cursos';
import { Card, Button, Input, Spinner } from '@/components/ui';
import { toast } from '@/hooks/useToast';
import { ArrowLeft, Save } from 'lucide-react';
import { useEffect } from 'react';

interface CursoDetail extends CriarCursoPayload {
  id: string;
}

export function CriarCursoPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: cursoData, isLoading: isLoadingCurso } = useQuery({
    queryKey: ['cursos', id],
    queryFn: () => cursosApi.getById(id as string),
    enabled: isEditing,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CriarCursoPayload>({
    resolver: zodResolver(CriarCursoPayloadSchema),
    defaultValues: {
      titulo: '',
      descricao: '',
      area: 'TECNOLOGIA',
      nivel: 'basico',
      visibilidade: 'publico',
    }
  });

  useEffect(() => {
    const curso = cursoData as unknown as CursoDetail | undefined;
    if (curso) {
      reset({
        titulo: curso.titulo,
        descricao: curso.descricao,
        area: curso.area || 'TECNOLOGIA',
        nivel: curso.nivel || 'basico',
        visibilidade: curso.visibilidade || 'publico',
      });
    }
  }, [cursoData, reset]);

  const mutation = useMutation({
    mutationFn: (data: CriarCursoPayload) => 
      isEditing ? cursosApi.update(id as string, data) : cursosApi.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cursos', 'meus'] });
      toast({ title: isEditing ? 'Curso atualizado!' : 'Curso criado com sucesso!' });
      navigate('/app/mentor/cursos');
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao guardar curso', description: err.message, variant: 'error' });
    }
  });

  if (isEditing && isLoadingCurso) {
    return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>;
  }

  const handleFormSubmit = handleSubmit((data) => {
    mutation.mutate(data);
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => { navigate('/app/mentor/cursos'); }}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold font-sora">{isEditing ? 'Editar Curso' : 'Criar Novo Curso'}</h1>
      </div>

      <Card className="p-6">
        <form onSubmit={(e) => { void handleFormSubmit(e); }} className="space-y-6">
          <Input 
            label="Título do Curso" 
            placeholder="Ex: Introdução à Engenharia de Software"
            {...register('titulo')}
            error={errors.titulo?.message}
          />

          <div className="space-y-1">
            <label className="text-sm font-medium text-text-secondary">Descrição</label>
            <textarea 
              className="flex min-h-[120px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Descreve os objetivos e o público-alvo do curso."
              {...register('descricao')}
            />
            {errors.descricao && <p className="text-xs text-error font-medium">{errors.descricao.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-text-secondary">Área</label>
              <select 
                className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
                {...register('area')}
              >
                <option value="TECNOLOGIA">Tecnologia</option>
                <option value="SAUDE">Saúde</option>
                <option value="ENGENHARIA">Engenharia</option>
                <option value="GESTAO">Gestão</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-text-secondary">Nível</label>
              <select 
                className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
                {...register('nivel')}
              >
                <option value="basico">Básico</option>
                <option value="medio">Médio</option>
                <option value="avancado">Avançado</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-text-secondary">Visibilidade</label>
              <select 
                className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
                {...register('visibilidade')}
              >
                <option value="publico">Público</option>
                <option value="privado">Privado</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border/40">
            <Button type="submit" isLoading={mutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {isEditing ? 'Guardar Alterações' : 'Criar Curso'}
            </Button>
            
            <Button type="button" variant="ghost" onClick={() => { navigate('/app/mentor/cursos'); }}>
              Cancelar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

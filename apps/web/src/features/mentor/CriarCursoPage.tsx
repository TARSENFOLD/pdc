import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { CriarCursoPayloadSchema, type CriarCursoPayload, type EstadoEditorial } from '@pdc/shared';
import { cursosApi } from '@/lib/api/cursos';
import { Card, Button, Input, Spinner } from '@/components/ui';
import { toast } from '@/hooks/useToast';
import { ArrowLeft, Save, Send } from 'lucide-react';
import { useEffect } from 'react';

interface CursoDetail extends CriarCursoPayload {
  id: string;
  estado: EstadoEditorial;
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
      area: '',
      nivel: 'basico',
      capaUrl: '',
      preco: 0,
      visibilidade: 'publico',
    }
  });

  useEffect(() => {
    if (cursoData) {
      const curso = cursoData as unknown as CursoDetail;
      reset({
        titulo: curso.titulo,
        descricao: curso.descricao,
        area: curso.area || '',
        nivel: curso.nivel || 'basico',
        capaUrl: curso.capaUrl || '',
        preco: curso.preco || 0,
        visibilidade: curso.visibilidade || 'publico',
      });
    }
  }, [cursoData, reset]);

  const mutation = useMutation({
    mutationFn: (data: CriarCursoPayload) => 
      isEditing ? cursosApi.editar(id, data) : cursosApi.criar(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cursos', 'meus'] }).catch(() => {});
      toast({ title: isEditing ? 'Curso atualizado!' : 'Curso criado com sucesso!' });
      navigate('/app/mentor/cursos');
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao guardar curso', description: err.message, variant: 'error' });
    }
  });

  const reviewMutation = useMutation({
    mutationFn: () => cursosApi.updateEstado(id as string, 'review'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cursos', id] }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['cursos', 'meus'] }).catch(() => {});
      toast({ title: 'Enviado para revisão!' });
      navigate('/app/mentor/cursos');
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao enviar para revisão', description: err.message, variant: 'error' });
    }
  });

  if (isEditing && isLoadingCurso) {
    return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>;
  }

  const handleFormSubmit = handleSubmit((data) => {
    mutation.mutate(data);
  });

  const handleReview = () => {
    reviewMutation.mutate();
  };

  const curso = cursoData as unknown as CursoDetail | undefined;

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
            placeholder="Ex: Introdução ao Design Digital"
            {...register('titulo')}
            error={errors.titulo?.message}
          />

          <div className="space-y-1">
            <label className="text-sm font-medium text-text-secondary">Descrição</label>
            <textarea 
              className="flex min-h-[120px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Descreve o que os alunos vão aprender neste curso..."
              {...register('descricao')}
            />
            {errors.descricao && <p className="text-xs text-error font-medium">{errors.descricao.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-text-secondary">Área</label>
              <select 
                className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
                {...register('area')}
              >
                <option value="">Seleciona uma área...</option>
                <option value="tecnologia">Tecnologia</option>
                <option value="design">Design</option>
                <option value="marketing">Marketing</option>
                <option value="negocios">Negócios</option>
                <option value="saude">Saúde</option>
                <option value="artes">Artes</option>
              </select>
              {errors.area && <p className="text-xs text-error font-medium">{errors.area.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-text-secondary">Nível</label>
              <select 
                className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
                {...register('nivel')}
              >
                <option value="basico">Básico</option>
                <option value="intermedio">Intermédio</option>
                <option value="avancado">Avançado</option>
              </select>
              {errors.nivel && <p className="text-xs text-error font-medium">{errors.nivel.message}</p>}
            </div>
          </div>

          <Input 
            label="URL da Capa (opcional)" 
            placeholder="https://exemplo.com/imagem.jpg"
            {...register('capaUrl')}
            error={errors.capaUrl?.message}
          />

          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border/40">
            <div className="flex gap-3">
              <Button type="submit" isLoading={mutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {isEditing ? 'Guardar Alterações' : 'Criar Curso'}
              </Button>
              
              {isEditing && curso?.estado === 'draft' && (
                <Button 
                  type="button" 
                  variant="secondary" 
                  className="border-amber/50 text-amber hover:bg-amber/10"
                  onClick={handleReview}
                  isLoading={reviewMutation.isPending}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Submeter para Revisão
                </Button>
              )}
            </div>
            
            <Button type="button" variant="ghost" onClick={() => { navigate('/app/mentor/cursos'); }}>
              Cancelar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

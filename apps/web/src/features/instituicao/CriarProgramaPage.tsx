import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CriarProgramaPayloadSchema, type CriarProgramaPayload } from '@pdc/shared';
import { programasApi } from '@/lib/api/programas';
import { Card, Button, Input } from '@/components/ui';
import { toast } from '@/hooks/useToast';

export function CriarProgramaPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { register, handleSubmit, control, formState: { errors } } = useForm<CriarProgramaPayload>({
    resolver: zodResolver(CriarProgramaPayloadSchema),
    defaultValues: {
      tipo: 'standard',
    }
  });

  const tipoSelecionado = useWatch({ control, name: 'tipo' });

  const mutation = useMutation({
    mutationFn: (data: CriarProgramaPayload) => programasApi.criar(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programas', 'meus'] });
      toast({ title: 'Programa criado com sucesso!' });
      navigate('/app/instituicao/programas');
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Erro ao criar programa';
      toast({ title: 'Erro', description: message, variant: 'error' });
    }
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Criar Novo Programa</h1>
        <p className="text-muted-foreground">Os programas podem agrupar cursos, experiências ou oferecer modalidades exclusivas.</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit((data: CriarProgramaPayload) => { mutation.mutate(data); })} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Tipo de Programa</label>
            <select 
              className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
              {...register('tipo')}
            >
              <option value="standard">Standard (Cursos/Experiências)</option>
              <option value="shadowapro">ShadowApro (Shadowing de Profissional)</option>
              <option value="eduvisit">EduVisit (Visita Educativa)</option>
            </select>
          </div>

          <Input 
            label="Título do Programa" 
            placeholder="Ex: Futuros Engenheiros 2026"
            {...register('titulo')}
            error={errors.titulo?.message || ''}
          />
          
          <div className="space-y-1">
            <label className="text-sm font-medium">Descrição</label>
            <textarea 
              className="flex min-h-[100px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Descreva os objetivos e o que o programa oferece..."
              {...register('descricao')}
            />
            {errors.descricao && <p className="text-xs text-error">{errors.descricao.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Área Vocacional</label>
              <select 
                className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
                {...register('area')}
              >
                <option value="ENGENHARIA">Engenharia</option>
                <option value="SAUDE">Saúde</option>
                <option value="TECNOLOGIA">Tecnologia</option>
                <option value="AGRONOMIA">Agronomia</option>
                <option value="GESTAO">Gestão</option>
                <option value="EDUCACAO">Educação</option>
                <option value="DIREITO">Direito</option>
                <option value="CIENCIAS_SOCIAIS">Ciências Sociais</option>
                <option value="ARTES">Artes</option>
                <option value="OUTRO">Outro</option>
              </select>
              {errors.area && <p className="text-xs text-error">{errors.area.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Modalidade</label>
              <select 
                className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
                {...register('modalidade')}
              >
                <option value="presencial">Presencial</option>
                <option value="online">Online</option>
                <option value="hibrido">Híbrido</option>
              </select>
              {errors.modalidade && <p className="text-xs text-error">{errors.modalidade.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Vagas (Opcional)" 
              type="number"
              {...register('vagas', { valueAsNumber: true })}
              error={errors.vagas?.message || ''}
            />
            <Input 
              label="Requisitos (Opcional)" 
              placeholder="Ex: Alunos do 10º ano"
              {...register('requisitos')}
              error={errors.requisitos?.message || ''}
            />
          </div>

          {tipoSelecionado === 'shadowapro' && (
            <div className="grid grid-cols-2 gap-4 rounded-md border border-info/20 bg-info/5 p-4">
              <Input 
                label="Profissional a acompanhar" 
                placeholder="Nome do profissional"
                {...register('profissionalShadow')}
              />
              <Input 
                label="Área de Shadowing" 
                placeholder="Ex: Gestão de Obra"
                {...register('areaShadowing')}
              />
            </div>
          )}

          {tipoSelecionado === 'eduvisit' && (
            <div className="grid grid-cols-2 gap-4 rounded-md border border-info/20 bg-info/5 p-4">
              <Input 
                label="URL da Visita Virtual (iframe)" 
                placeholder="https://..."
                {...register('visitaUrl')}
              />
              <Input 
                label="Localização Física" 
                placeholder="Caso haja visita presencial"
                {...register('localizacaoFisica')}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Data de Início" 
              type="date"
              {...register('dataInicio')}
              error={errors.dataInicio?.message || ''}
            />
            <Input 
              label="Data de Fim" 
              type="date"
              {...register('dataFim')}
              error={errors.dataFim?.message || ''}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => { navigate(-1); }}>Cancelar</Button>
            <Button type="submit" isLoading={mutation.isPending}>
              Criar Programa
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

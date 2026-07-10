import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projetosApi } from '@/lib/api/projetos';
import { CriarProjetoPayloadSchema, type CriarProjetoPayload } from '@pdc/shared';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input, Select, Spinner } from '@/components/ui';
import { toast } from '@/hooks/useToast';
import { BuilderShell, BuilderSection, BuilderUploadZone, BuilderActionsBar } from '@/components/builders';
import { Lock } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { ProjetoTagSelector } from './components/ProjetoTagSelector';
import { ProjetoModeSelector } from './components/ProjetoModeSelector';

function emptyStringToUndefined(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

export function ProjetoFormPage() {
  const { id } = useParams<{ id: string }>();
  const projetoId = id ?? '';
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const isEdit = !!id;
  const pendingActionRef = useRef<'draft' | 'review' | 'publish'>('draft');

  const { data: rawProjeto, isLoading } = useQuery({
    queryKey: ['projetos', projetoId],
    queryFn: () => projetosApi.getById(projetoId),
    enabled: isEdit,
  });
  const projeto = rawProjeto?.data[0];

  const form = useForm<CriarProjetoPayload>({
    resolver: zodResolver(CriarProjetoPayloadSchema) as Resolver<CriarProjetoPayload>,
    defaultValues: {
      titulo: '',
      abstract: '',
      area: 'TECNOLOGIA',
      modos: ['exposicao'],
      visibilidade: 'publico',
      tags: [],
    }
  });

  const { register, reset, setValue, watch, formState: { errors } } = form;
  const tags = watch('tags');
  const modos = watch('modos');

  useEffect(() => {
    if (projeto) {
      reset({
        titulo: projeto.titulo,
        abstract: projeto.abstract,
        core: projeto.core,
        area: projeto.area,
        modos: projeto.modos,
        visibilidade: projeto.visibilidade,
        repoUrl: projeto.repoUrl ?? '',
        demoUrl: projeto.demoUrl ?? '',
        capaUrl: projeto.capaUrl ?? '',
        tags: projeto.tags,
      });
    }
  }, [projeto, reset]);

  const mutation = useMutation({
    mutationFn: (data: CriarProjetoPayload) =>
      isEdit ? projetosApi.update(projetoId, data) : projetosApi.create(data),
    onSuccess: async (saved: { id?: string; data?: { id?: string; eventId?: string }; eventId?: string }) => {
      void qc.invalidateQueries({ queryKey: ['projetos'] });

      const newId = saved.data?.id || saved.id;
      const targetId = newId || projetoId;
      const action = pendingActionRef.current;

      if (action === 'review' && targetId) {
        try {
          await projetosApi.transitionState(targetId, 'review');
          toast({ title: 'Projeto submetido para revisão' });
        } catch {
          toast({ title: 'Projeto guardado, mas falhou a submissão para revisão', variant: 'error' });
        }
        navigate(`/app/projetos/${targetId}`);
        return;
      }

      if (action === 'publish' && targetId) {
        try {
          await projetosApi.transitionState(targetId, 'published');
          toast({ title: 'Projeto publicado!' });
        } catch {
          toast({ title: 'Projeto guardado, mas falhou a publicação', variant: 'error' });
        }
        navigate(`/app/projetos/${targetId}`);
        return;
      }

      // Default: draft save
      toast({ title: isEdit ? 'Projeto atualizado' : 'Projeto criado com sucesso' });
      navigate(`/app/projetos/${targetId}`);
    },
    onError: (err: { response?: { data?: { error?: string } } }) => toast({
      title: 'Erro ao guardar projeto',
      description: err.response?.data?.error || 'Falha na persistência',
      variant: 'error'
    })
  });
  const handleSaveDraft = form.handleSubmit((data) => {
    pendingActionRef.current = 'draft';
    mutation.mutate(data);
  });

  const handleSubmitReview = form.handleSubmit((data) => {
    pendingActionRef.current = 'review';
    mutation.mutate(data);
  });

  const handlePublish = form.handleSubmit((data) => {
    pendingActionRef.current = 'publish';
    mutation.mutate(data);
  });

  if (isEdit && isLoading) return <div className="flex h-screen items-center justify-center bg-canvas"><Spinner size="lg" /></div>;

  return (
    <>
      <BuilderShell
        form={form}
        title={isEdit ? 'Editar Projeto' : 'Novo Projeto'}
        description="Cria um projeto que demonstra as tuas competências. Separa o resumo público do conteúdo técnico."
        state={projeto?.estado ?? 'draft'}
        breadcrumbs={[
        { label: 'Início', to: '/app' },
        { label: 'Projetos', to: '/app/projetos' },
        { label: isEdit ? 'Editar' : 'Novo Projeto' }
      ]}
      sections={[
        { id: 'identidade', label: 'Identidade' },
        { id: 'pitch', label: 'Pitch Público' },
        { id: 'core', label: 'Núcleo Técnico' },
        { id: 'modos', label: 'Modos de Atuação' },
        { id: 'recursos', label: 'Repositórios e Tags' },
      ]}
      actions={
        <BuilderActionsBar
          state={projeto?.estado ?? 'draft'}
          userRole={user?.role || 'estudante'}
          onSaveDraft={() => { void handleSaveDraft(); }}
          onSubmitReview={() => { void handleSubmitReview(); }}
          onPublish={() => { void handlePublish(); }}
          isSubmitting={mutation.isPending}
        />
      }
    >
      <BuilderSection
        value="identidade"
        title="Identidade do Projeto"
        description="Título, área e visibilidade." 
      >
        <div className="space-y-6">
          <Input label="Título do Projeto" {...register('titulo')} error={errors.titulo?.message} />
          <div className="grid grid-cols-2 gap-4">
             <Select label="Área de Domínio" {...register('area')}>
                <option value="TECNOLOGIA">Tecnologia</option>
                <option value="ENGENHARIA">Engenharia</option>
                <option value="SAUDE">Saúde</option>
                <option value="DIREITO">Direito</option>
                <option value="GESTAO">Gestão</option>
                <option value="EDUCACAO">Educação</option>
                <option value="ARTES">Artes</option>
                <option value="CIENCIAS_AGRARIAS">Ciências Agrárias</option>
                <option value="CIENCIAS_SOCIAIS">Ciências Sociais</option>
                <option value="COMUNICACAO">Comunicação</option>
                <option value="CIENCIAS_NATURAIS">Ciências Naturais</option>
                <option value="ARQUITETURA">Arquitetura</option>
                <option value="TURISMO_HOTELARIA">Turismo e Hotelaria</option>
                <option value="DESPORTO">Desporto</option>
                <option value="OUTRA">Outra</option>
             </Select>
             <Select label="Visibilidade" {...register('visibilidade')}>
                <option value="publico">Público (Catálogo)</option>
                <option value="privado">Privado (Apenas eu)</option>
             </Select>
          </div>
        </div>
      </BuilderSection>

      <BuilderSection
        value="pitch"
        title="Pitch Público (Abstract)"
        description="Resumo visível a todos no catálogo. Capta a atenção do ecossistema."
      >
        <div className="space-y-4">
          <textarea 
            className="flex min-h-[120px] w-full rounded-sm border border-ink-tertiary/20 bg-recessed px-4 py-3 text-sm focus:border-accent outline-none transition-all"
            placeholder="Descreve o propósito e impacto do projeto..."
            {...register('abstract')}
          />
          {errors.abstract && <p className="text-xs text-accent-danger">{errors.abstract.message}</p>}
          <BuilderUploadZone entityType="projeto" onUploadComplete={(urls) => {
            if (urls.length > 0 && urls[0]) {
              setValue('capaUrl', urls[0]);
            }
          }} />
        </div>
      </BuilderSection>

      <BuilderSection
        value="core"
        title="Núcleo Técnico (Core)"
        description="Documentação técnica e detalhes. Acesso controlado — só pessoas autorizadas verão esta secção."
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-accent mb-2">
             <Lock size={12} /> Camada Privada
          </div>
          <p className="text-xs text-ink-tertiary mb-3">Esta camada só será visível para pessoas autorizadas.</p>
          <textarea 
            className="flex min-h-[200px] w-full rounded-sm border border-accent/20 bg-accent/5 px-4 py-3 text-sm focus:border-accent outline-none transition-all"
            placeholder="Documentação técnica, roadmap, ou links privados..."
            {...register('core', { setValueAs: emptyStringToUndefined })}
          />
          {errors.core && <p className="text-xs text-accent-danger">{errors.core.message}</p>}
        </div>
      </BuilderSection>

      <BuilderSection
        value="modos"
        title="Modos de Atuação"
        description="Como o projeto interage com outros talentos e mentores."
      >
        <ProjetoModeSelector
          register={register}
          selected={modos}
          error={errors.modos?.message}
        />
      </BuilderSection>

      <BuilderSection
        value="recursos"
        title="Repositórios e Tags"
        description="Links externos e categorização do ativo."
      >
        <div className="space-y-6">
           <div className="grid grid-cols-2 gap-4">
              <Input label="URL Repositório" {...register('repoUrl', { setValueAs: emptyStringToUndefined })} placeholder="https://github.com/..." />
              <Input label="URL Demo" {...register('demoUrl', { setValueAs: emptyStringToUndefined })} placeholder="https://demo.exemplo.ao" />
           </div>
           <ProjetoTagSelector
             tags={tags}
             onChange={(nextTags) => { setValue('tags', nextTags, { shouldDirty: true, shouldValidate: true }); }}
             error={errors.tags?.message}
           />
        </div>
      </BuilderSection>
    </BuilderShell>

    </>
  );
}

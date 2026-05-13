import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projetosApi } from '@/lib/api/projetos';
import { CriarProjetoPayloadSchema, type CriarProjetoPayload } from '@pdc/shared';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input, Select, Button, Spinner } from '@/components/ui';
import { toast } from '@/hooks/useToast';
import { BuilderShell, BuilderSection, BuilderUploadZone, BuilderActionsBar } from '@/components/builders';
import { EcosystemImpactPanel } from '@/components/ecosystem/EcosystemImpactPanel';
import { motion, AnimatePresence } from 'motion/react';
import { Lock } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';

export function ProjetoFormPage() {
  const { id } = useParams<{ id: string }>();
  const projetoId = id ?? '';
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const isEdit = !!id;
  const [lastEventId, setLastEventId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
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
      core: '',
      area: 'TECNOLOGIA',
      modos: ['exposicao'],
      visibilidade: 'publico',
      tags: [],
    }
  });

  const { register, reset, setValue, formState: { errors } } = form;

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
      if (newId) setSavedId(newId);
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
      const eventId = saved.eventId || saved.data?.eventId;
      if (eventId) {
        setLastEventId(eventId);
      } else {
        navigate(`/app/projetos/${targetId}`);
      }
    },
    onError: (err: { response?: { data?: { error?: string } } }) => toast({
      title: 'Erro ao guardar projeto',
      description: err.response?.data?.error || 'Falha na persistência',
      variant: 'error'
    })
  });
  const aclMutation = useMutation({
    mutationFn: ({ perfilId, acao }: { perfilId: string, acao: 'aprovar' | 'rejeitar' }) => 
      projetosApi.gerirACL(projetoId, perfilId, acao),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['projetos', id] });
      toast({ title: 'Permissão de acesso atualizada.' });
    }
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
        ...(isEdit ? [{ id: 'acl', label: 'Gestão de Acessos' }] : []),
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
          <BuilderUploadZone onUploadComplete={(urls) => {
            if (urls.length > 0 && urls[0]) {
              setValue('capaUrl', urls[0]);
            }
          }} />
        </div>
      </BuilderSection>

      <BuilderSection
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
            {...register('core')}
          />
          {errors.core && <p className="text-xs text-accent-danger">{errors.core.message}</p>}
        </div>
      </BuilderSection>

      <BuilderSection
        title="Modos de Atuação"
        description="Como o projeto interage com outros talentos e mentores."
      >
        <div className="grid grid-cols-2 gap-4">
          {[
            { id: 'exposicao', label: 'Exposição', desc: 'Apenas visualização.' },
            { id: 'colaboracao', label: 'Colaboração', desc: 'Aceita contribuidores.' },
            { id: 'mentoria', label: 'Mentoria', desc: 'Procura orientação.' },
            { id: 'financiamento', label: 'Financiamento', desc: 'Procura investimento.' },
            { id: 'feedbackComunitario', label: 'Feedback Comunitário', desc: 'Pede opiniões da comunidade.' },
          ].map((modo) => (
            <label key={modo.id} className="flex items-start gap-3 p-4 rounded-sm border border-ink-tertiary/10 bg-recessed cursor-pointer hover:border-accent/20 transition-all">
               <input 
                 type="checkbox" 
                 value={modo.id} 
                 className="mt-1 accent-accent"
                 {...register('modos')}
               />
               <div>
                  <p className="text-sm font-semibold text-ink-primary">{modo.label}</p>
                  <p className="text-[10px] text-ink-tertiary">{modo.desc}</p>
               </div>
            </label>
          ))}
        </div>
      </BuilderSection>

      {isEdit && (
        <BuilderSection
          title="Gestão de Acessos (ACL)"
          description="Pedidos de acesso ao núcleo técnico do teu projeto."
        >
          <div className="space-y-4">
            {!projeto?.acessoCoreACL || projeto.acessoCoreACL.length === 0 ? (
              <p className="text-sm text-ink-secondary italic py-4">Nenhum pedido de acesso pendente.</p>
            ) : (
              projeto.acessoCoreACL.map((entry) => (
                <div key={entry.perfilId} className="flex items-center justify-between p-4 rounded-sm bg-canvas border border-ink-tertiary/10">
                   <div>
                      <p className="text-sm font-semibold text-ink-primary">ID: {entry.perfilId}</p>
                      <p className="text-[9px] text-ink-tertiary uppercase tracking-wide">{entry.estado}</p>
                   </div>
                   {entry.estado === 'pendente' && (
                     <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="text-accent-success" onClick={() => { aclMutation.mutate({ perfilId: entry.perfilId, acao: 'aprovar' }); }}>Aprovar</Button>
                        <Button size="sm" variant="ghost" className="text-accent-danger" onClick={() => { aclMutation.mutate({ perfilId: entry.perfilId, acao: 'rejeitar' }); }}>Rejeitar</Button>
                     </div>
                   )}
                </div>
              ))
            )}
          </div>
        </BuilderSection>
      )}

      <BuilderSection
        value="recursos"
        title="Repositórios e Tags"
        description="Links externos e categorização do ativo."
      >
        <div className="space-y-6">
           <div className="grid grid-cols-2 gap-4">
              <Input label="URL Repositório" {...register('repoUrl')} placeholder="ex: github.com/..." />
              <Input label="URL Demo" {...register('demoUrl')} placeholder="ex: ver-demo.vercel.app" />
           </div>
           <div className="p-4 rounded-sm bg-recessed/30 border border-ink-tertiary/10 italic text-sm text-ink-secondary">
             Seletor de Tags avançado disponível em breve.
           </div>
        </div>
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
                const targetId = savedId || id;
                const path = targetId ? `/app/projetos/${targetId}` : '/app/projetos';
                setTimeout(() => { navigate(path); }, 3000);
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}



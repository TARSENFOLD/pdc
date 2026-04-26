import { useState, useEffect } from 'react';
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
import { useAuth } from '@/lib/auth/AuthContext';

export function ProjetoFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const isEdit = !!id;
  const [lastEventId, setLastEventId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const { data: projeto, isLoading } = useQuery({
    queryKey: ['projetos', id ?? ''],
    queryFn: () => projetosApi.getById(id ?? ''),
    enabled: isEdit,
  });

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
        core: projeto.core || '',
        area: projeto.area || 'TECNOLOGIA',
        modos: projeto.modos || ['exposicao'],
        visibilidade: projeto.visibilidade || 'publico',
        repoUrl: projeto.repoUrl || '',
        demoUrl: projeto.demoUrl || '',
        capaUrl: projeto.capaUrl || '',
        tags: projeto.tags || [],
      });
    }
  }, [projeto, reset]);

  const mutation = useMutation({
    mutationFn: (data: CriarProjetoPayload) => 
      isEdit ? projetosApi.update(id, data) : projetosApi.create(data),
    onSuccess: (saved: any) => {
      void qc.invalidateQueries({ queryKey: ['projetos'] });
      toast({ title: isEdit ? 'Projeto atualizado' : 'Projeto materializado!' });
      
      const newId = saved.data?.id || saved.id;
      if (newId) setSavedId(newId);

      if (saved?.eventId || saved.data?.eventId) {
        setLastEventId(saved?.eventId || saved.data?.eventId);
      } else {
        navigate(`/projetos/${newId || id}`);
      }
    },
    onError: (err: any) => toast({ 
      title: 'Erro na publicação', 
      description: err.response?.data?.error || 'Falha na persistência',
      variant: 'error' 
    })
  });

  const aclMutation = useMutation({
    mutationFn: ({ perfilId, acao }: { perfilId: string, acao: 'aprovar' | 'rejeitar' }) => 
      projetosApi.gerirACL(id!, perfilId, acao),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['projetos', id] });
      toast({ title: 'Permissão de acesso atualizada.' });
    }
  });

  const handleSave = () => {
    const data = form.getValues();
    mutation.mutate(data);
  };

  if (isEdit && isLoading) return <div className="flex h-screen items-center justify-center bg-canvas"><Spinner size="lg" /></div>;

  return (
    <>
      <BuilderShell
        form={form as any}
        title={isEdit ? "Editor de Ativo Soberano" : "Novo Projeto de Ecossistema"}
        description="Materializa o teu conhecimento em ativos reais. Separa o pitch público do núcleo técnico."
        state="published"      breadcrumbs={[
        { label: 'Início', to: '/app' },
        { label: 'Projetos', to: '/app/catalogo/projetos' },
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
          state="published"
          userRole={user?.role || 'estudante'}
          onSaveDraft={handleSave}
          onSubmitReview={handleSave}
          onPublish={handleSave}
          isSubmitting={mutation.isPending}
        />
      }
    >
      <BuilderSection
        value="identidade"
        title="Identidade do Ativo"
        description="Título, domínio e visibilidade global."
      >
        <div className="space-y-6">
          <Input label="Título do Projeto" {...register('titulo')} error={errors.titulo?.message} />
          <div className="grid grid-cols-2 gap-4">
             <Select label="Área de Domínio" {...register('area')}>
                <option value="TECNOLOGIA">Tecnologia</option>
                <option value="ENGENHARIA">Engenharia</option>
                <option value="ARTES">Artes</option>
                <option value="GESTAO">Gestão</option>
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
            className="flex min-h-[120px] w-full rounded-xl border border-ink-tertiary/20 bg-recessed px-4 py-3 text-sm focus:border-accent outline-none transition-all"
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
        value="core"
        title="Núcleo Técnico (Core)"
        description="Documentação profunda, segredos e lógica. Acesso controlado por ACL."
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-institutional-cobalt mb-2">
             <Lock size={12} /> Camada Protegida
          </div>
          <textarea 
            className="flex min-h-[200px] w-full rounded-xl border border-institutional-cobalt/20 bg-institutional-cobalt/5 px-4 py-3 text-sm focus:border-institutional-cobalt outline-none transition-all"
            placeholder="Documentação técnica, roadmap, ou links privados..."
            {...register('core')}
          />
          {errors.core && <p className="text-xs text-accent-danger">{errors.core.message}</p>}
        </div>
      </BuilderSection>

      <BuilderSection
        value="modos"
        title="Modos de Atuação"
        description="Como o projeto interage com outros talentos e mentores."
      >
        <div className="grid grid-cols-2 gap-4">
          {[
            { id: 'exposicao', label: 'Exposição', desc: 'Apenas visualização.' },
            { id: 'colaboracao', label: 'Colaboração', desc: 'Aceita contribuidores.' },
            { id: 'mentoria', label: 'Mentoria', desc: 'Procura orientação.' },
            { id: 'financiamento', label: 'Financiamento', desc: 'Procura investimento.' },
          ].map((modo) => (
            <label key={modo.id} className="flex items-start gap-3 p-4 rounded-xl border border-ink-tertiary/10 bg-recessed cursor-pointer hover:border-accent/20 transition-all">
               <input 
                 type="checkbox" 
                 value={modo.id} 
                 className="mt-1 accent-accent"
                 {...register('modos')}
               />
               <div>
                  <p className="text-sm font-bold text-ink-primary">{modo.label}</p>
                  <p className="text-[10px] text-ink-tertiary">{modo.desc}</p>
               </div>
            </label>
          ))}
        </div>
      </BuilderSection>

      {isEdit && (
        <BuilderSection
          value="acl"
          title="Gestão de Acessos (ACL)"
          description="Pedidos de acesso ao núcleo técnico do teu projeto."
        >
          <div className="space-y-4">
            {!projeto?.acessoCoreACL || projeto.acessoCoreACL.length === 0 ? (
              <p className="text-sm text-ink-secondary italic py-4">Nenhum pedido de acesso pendente.</p>
            ) : (
              projeto.acessoCoreACL.map((entry) => (
                <div key={entry.perfilId} className="flex items-center justify-between p-4 rounded-xl bg-canvas border border-ink-tertiary/10">
                   <div>
                      <p className="text-sm font-bold text-ink-primary">ID: {entry.perfilId}</p>
                      <p className="text-[9px] text-ink-tertiary uppercase tracking-widest">{entry.estado}</p>
                   </div>
                   {entry.estado === 'pending' && (
                     <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="text-accent-success" onClick={() => aclMutation.mutate({ perfilId: entry.perfilId, acao: 'aprovar' })}>Aprovar</Button>
                        <Button size="sm" variant="ghost" className="text-accent-danger" onClick={() => aclMutation.mutate({ perfilId: entry.perfilId, acao: 'rejeitar' })}>Rejeitar</Button>
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
           <div className="p-4 rounded-xl bg-recessed/30 border border-ink-tertiary/10 italic text-sm text-ink-secondary">
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
                const path = targetId ? `/projetos/${targetId}` : '/app/catalogo/projetos';
                setTimeout(() => navigate(path), 3000);
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}

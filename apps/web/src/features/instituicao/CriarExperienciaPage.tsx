import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CriarExperienciaPayloadSchema, type CriarExperienciaPayload } from '@pdc/shared';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { experienciasApi } from '@/lib/api/experiencias';
import { Input, Select, Button } from '@/components/ui';
import { toast } from '@/hooks/useToast';
import { BuilderShell, BuilderSection, BuilderUploadZone, BuilderActionsBar } from '@/components/builders';
import { EcosystemImpactPanel } from '@/components/ecosystem/EcosystemImpactPanel';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/lib/auth/AuthContext';

const STORAGE_KEY = 'pdc_builder_experiencia_draft';

export function CriarExperienciaPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [lastEventId, setLastEventId] = useState<string | null>(null);

  const form = useForm<CriarExperienciaPayload>({
    resolver: zodResolver(CriarExperienciaPayloadSchema),
    defaultValues: {
      titulo: '',
      descricao: '',
      area: 'SAUDE',
      nivel: 'basico',
      modalidade: 'online',
      painelRealidade: { principaisEmpregadores: [] },
      muralVozes: [],
      guiaInstitucional: { fotosCampus: [], timelineCurricular: [] },
    }
  });

  const { register, control, setValue, watch, formState: { errors } } = form;
  const muralArray = useFieldArray({ control, name: 'muralVozes' });
  const timelineArray = useFieldArray({ control, name: 'guiaInstitucional.timelineCurricular' });

  // Autosave
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        Object.keys(parsed).forEach(key => {
          setValue(key as any, parsed[key]);
        });
      } catch (e) {
        console.error('Falha ao recuperar draft', e);
      }
    }

    const subscription = watch((value) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    });
    return () => subscription.unsubscribe();
  }, [setValue, watch]);

  const mutation = useMutation({
    mutationFn: (data: CriarExperienciaPayload) => experienciasApi.create(data),
    onSuccess: (res: { data: { id: string; eventId?: string } }) => {
      void queryClient.invalidateQueries({ queryKey: ['experiencias', 'minhas'] });
      localStorage.removeItem(STORAGE_KEY);
      toast({ title: 'Experiência Materializada!' });

      if (res.data?.eventId) {
        setLastEventId(res.data.eventId);
      } else {
        navigate('/app/dashboard/instituicao');
      }
    },
    onError: (err: { response?: { data?: { error?: string } }; message?: string }) => toast({ 
      title: 'Falha na publicação', 
      description: err.response?.data?.error || err.message || 'Erro desconhecido',
      variant: 'error' 
    })
  });

  const handleSave = () => {
    const data = form.getValues();
    mutation.mutate(data);
  };

  return (
    <>
      <BuilderShell
        form={form as any}
        title="Gerador de Experiência Premium"
        description="Materializa o impacto da tua instituição através de dados reais e vozes autênticas."
        state="draft"      breadcrumbs={[
        { label: 'Início', to: '/app' },
        { label: 'Experiências', to: '/app/catalogo' },
        { label: 'Nova Experiência' }
      ]}
      sections={[
        { id: 'identidade', label: 'Identidade' },
        { id: 'realidade', label: 'Painel de Realidade' },
        { id: 'vozes', label: 'Mural de Vozes' },
        { id: 'guia', label: 'Guia Institucional' },
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
        value="identidade"
        title="Identidade e Contexto"
        description="O que é esta experiência e a quem se destina."
      >
        <div className="space-y-6">
          <Input label="Título da Experiência" {...register('titulo')} error={errors.titulo?.message} />
          <div className="space-y-1">
            <label className="text-sm font-bold uppercase tracking-widest text-ink-tertiary">Descrição Narrativa</label>
            <textarea 
              className="flex min-h-[120px] w-full rounded-xl border border-ink-tertiary/20 bg-recessed px-4 py-3 text-sm focus:border-accent outline-none transition-all"
              {...register('descricao')}
            />
            {errors.descricao && <p className="text-xs text-accent-danger">{errors.descricao.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Área Vocacional" {...register('area')}>
               <option value="TECNOLOGIA">Tecnologia</option>
               <option value="SAUDE">Saúde</option>
               <option value="GESTAO">Gestão</option>
               <option value="ARTES">Artes</option>
            </Select>
            <Select label="Nível" {...register('nivel')}>
               <option value="basico">Básico</option>
               <option value="medio">Médio</option>
               <option value="avancado">Avançado</option>
            </Select>
          </div>
        </div>
      </BuilderSection>

      <BuilderSection
        value="realidade"
        title="Painel de Realidade"
        description="Dados de mercado e empregabilidade (Spec 04)."
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Salário Médio Base" {...register('painelRealidade.salarioMedio')} placeholder="ex: 1.200€ - 1.500€" />
            <Input label="Taxa de Empregabilidade" {...register('painelRealidade.taxaEmpregabilidade')} placeholder="ex: 94%" />
          </div>
          <p className="text-[10px] font-black text-ink-tertiary uppercase tracking-widest">Principais Empregadores</p>
          <div className="p-4 border border-ink-tertiary/10 rounded-xl bg-recessed/30 italic text-sm text-ink-secondary">
            Configuração de marcas parceiras em breve.
          </div>
        </div>
      </BuilderSection>

      <BuilderSection
        value="vozes"
        title="Mural de Vozes"
        description="Depoimentos reais de quem já viveu a experiência."
      >
        <div className="space-y-6">
          {muralArray.fields.map((field, index) => (
            <div key={field.id} className="p-6 border border-ink-tertiary/10 rounded-2xl bg-canvas space-y-4">
              <Input label="Autor" {...register(`muralVozes.${index}.autor`)} />
              <Input label="Cargo/Função" {...register(`muralVozes.${index}.cargo`)} />
              <textarea 
                placeholder="O depoimento..."
                className="w-full rounded-xl border border-ink-tertiary/10 bg-recessed p-3 text-sm"
                {...register(`muralVozes.${index}.depoimento`)}
              />
              <Button variant="ghost" size="sm" className="text-accent-danger" onClick={() => muralArray.remove(index)}>Remover Voz</Button>
            </div>
          ))}
          <Button variant="outline" className="w-full" onClick={() => muralArray.append({ autor: '', cargo: '', depoimento: '' })}>
            + Adicionar Testemunho
          </Button>
        </div>
      </BuilderSection>

      <BuilderSection
        value="guia"
        title="Guia Institucional"
        description="Vitrinas do campus e jornada curricular."
      >
        <div className="space-y-8">
           <div>
             <p className="text-[10px] font-black text-ink-tertiary uppercase tracking-widest mb-4">Fotos do Campus / Laboratórios</p>
             <BuilderUploadZone 
               multiple
               onUploadComplete={(urls) => {
                 const current = watch('guiaInstitucional.fotosCampus') || [];
                 setValue('guiaInstitucional.fotosCampus', [...current, ...urls]);
               }} 
             />
           </div>

           <div className="space-y-4">
              <p className="text-[10px] font-black text-ink-tertiary uppercase tracking-widest">Timeline Curricular</p>
              {timelineArray.fields.map((field, index) => (
                <div key={field.id} className="flex gap-4 items-end">
                   <Input label="Ano/Fase" {...register(`guiaInstitucional.timelineCurricular.${index}.ano`)} />
                   <Input label="Foco Principal" {...register(`guiaInstitucional.timelineCurricular.${index}.foco`)} className="flex-1" />
                   <Button variant="ghost" onClick={() => timelineArray.remove(index)}>X</Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => timelineArray.append({ ano: '', foco: '' })}>+ Adicionar Fase</Button>
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
                setTimeout(() => navigate('/app/dashboard/instituicao'), 3000);
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}

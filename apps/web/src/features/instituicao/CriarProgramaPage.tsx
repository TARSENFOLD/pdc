import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CriarProgramaPayloadSchema, type CriarProgramaPayload } from '@pdc/shared';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { programasApi } from '@/lib/api/programas';
import { Input, Select } from '@/components/ui';
import { toast } from '@/hooks/useToast';
import { BuilderShell, BuilderSection, BuilderActionsBar } from '@/components/builders';
import { EcosystemImpactPanel } from '@/components/ecosystem/EcosystemImpactPanel';
import { motion, AnimatePresence } from 'motion/react';
import { Layers, Coins } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';

export function CriarProgramaPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [lastEventId, setLastEventId] = useState<string | null>(null);

  const form = useForm<CriarProgramaPayload>({
    resolver: zodResolver(CriarProgramaPayloadSchema),
    defaultValues: {
      titulo: '',
      proposito: '',
      metodologia: '',
      tipo: 'standard',
      area: 'GESTAO',
      modalidade: 'presencial',
      vagas: 10,
      cursosIds: [],
      experienciasIds: [],
      simulacoesIds: [],
      projetosIds: [],
    }
  });

  const { register, formState: { errors } } = form;

  const mutation = useMutation({
    mutationFn: (data: CriarProgramaPayload) => programasApi.create(data),
    onSuccess: (res: any) => {
      void queryClient.invalidateQueries({ queryKey: ['programas', 'meus'] });
      toast({ title: 'Programa Materializado!', description: 'O ecossistema foi atualizado com a nova oferta.' });
      
      if (res.data?.eventId) {
        setLastEventId(res.data.eventId);
      } else {
        navigate('/app/dashboard/instituicao');
      }
    },
    onError: (err: any) => toast({ 
      title: 'Erro na criação', 
      description: err.response?.data?.error || 'Erro desconhecido',
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
        title="Arquitetura de Programa de Acesso"
        description="Agrupa ativos educativos, define o propósito e governa o acesso ao talento."
        state="draft"      breadcrumbs={[
        { label: 'Início', to: '/app' },
        { label: 'Programas', to: '/app/catalogo/programas' },
        { label: 'Novo Programa' }
      ]}
      sections={[
        { id: 'proposito', label: 'Propósito' },
        { id: 'metodologia', label: 'Metodologia' },
        { id: 'conteudos', label: 'Conteúdos' },
        { id: 'inscricao', label: 'Inscrição' },
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
        value="proposito"
        title="Propósito e Identidade"
        description="O valor diferenciador e objetivo pedagógico central."
      >
        <div className="space-y-6">
          <Input label="Título do Programa" {...register('titulo')} error={errors.titulo?.message} />
          <div className="space-y-1">
            <label className="text-sm font-bold uppercase tracking-widest text-ink-tertiary">Objetivo Soberano (Propósito)</label>
            <textarea 
              className="flex min-h-[120px] w-full rounded-xl border border-ink-tertiary/20 bg-recessed px-4 py-3 text-sm focus:border-accent outline-none transition-all"
              {...register('proposito')}
            />
            {errors.proposito && <p className="text-xs text-accent-danger">{errors.proposito.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
             <Select label="Domínio Vocacional" {...register('area')}>
                <option value="GESTAO">Gestão</option>
                <option value="TECNOLOGIA">Tecnologia</option>
                <option value="SAUDE">Saúde</option>
                <option value="DIREITO">Direito</option>
             </Select>
             <Select label="Tipo de Programa" {...register('tipo')}>
                <option value="standard">Standard</option>
                <option value="shadowapro">Shadow a Pro</option>
                <option value="eduvisit">EduVisita</option>
             </Select>
          </div>
        </div>
      </BuilderSection>

      <BuilderSection
        value="metodologia"
        title="Metodologia e Recursos"
        description="Como o programa é entregue e que meios são disponibilizados."
      >
        <div className="space-y-6">
          <div className="space-y-1">
            <label className="text-sm font-bold uppercase tracking-widest text-ink-tertiary">Descrição Metodológica</label>
            <textarea 
              className="flex min-h-[120px] w-full rounded-xl border border-ink-tertiary/20 bg-recessed px-4 py-3 text-sm focus:border-accent outline-none transition-all"
              {...register('metodologia')}
            />
            {errors.metodologia && <p className="text-xs text-accent-danger">{errors.metodologia.message}</p>}
          </div>
          <p className="text-[10px] font-black text-ink-tertiary uppercase tracking-widest">Recursos Didáticos (JSON Spec)</p>
          <div className="p-4 border border-ink-tertiary/10 rounded-xl bg-recessed/30 italic text-sm text-ink-secondary">
            Mapeamento de recursos técnicos e infraestrutura disponível em breve.
          </div>
        </div>
      </BuilderSection>

      <BuilderSection
        value="conteudos"
        title="Conteúdos Agrupados"
        description="Integração de cursos, simulações e experiências práticas."
      >
        <div className="p-6 border border-dashed border-ink-tertiary/20 rounded-2xl bg-recessed/30 text-center space-y-4">
           <Layers size={32} className="mx-auto text-ink-tertiary opacity-40" />
           <p className="text-sm text-ink-secondary max-w-xs mx-auto">
             Seletor de conteúdos do catálogo para agregação soberana disponível na próxima iteração.
           </p>
           <div className="text-[9px] font-black uppercase tracking-widest text-ink-tertiary opacity-60">
              Módulos: {form.watch('cursosIds')?.length || 0} · Simul: {form.watch('simulacoesIds')?.length || 0}
           </div>
        </div>
      </BuilderSection>

      <BuilderSection
        value="inscricao"
        title="Regras de Inscrição e Preço"
        description="Governação de acesso e política comercial."
      >
        <div className="space-y-8">
           <div className="grid grid-cols-2 gap-4">
              <Select label="Modalidade" {...register('modalidade')}>
                <option value="presencial">Presencial</option>
                <option value="online">Online</option>
                <option value="hibrido">Híbrido</option>
              </Select>
              <Input label="Vagas Totais" type="number" {...register('vagas', { valueAsNumber: true })} />
           </div>
           <div className="space-y-4">
              <p className="text-[10px] font-black text-ink-tertiary uppercase tracking-widest flex items-center gap-2">
                <Coins size={14} className="text-accent" /> Política de Preços
              </p>
              <div className="p-4 rounded-xl border border-accent/20 bg-accent/5">
                 <p className="text-xs text-ink-secondary leading-relaxed">
                   Os programas seguem a precificação dinâmica baseada em mérito. Define o valor base e as bolsas de excelência (em breve).
                 </p>
              </div>
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

import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CriarCursoPayloadSchema, type CriarCursoPayload, AreaVocacionalSchema } from '@pdc/shared';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { http } from '@/lib/api/http';
import { Button, Card, Input, Badge } from '@/components/ui';
import { toast } from '@/hooks/useToast';
import { Plus, Trash2, Brain, Layout, BookOpen, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function SovereignCourseBuilder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<CriarCursoPayload>({
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

  const { fields: modulos, append: appendModulo, remove: removeModulo } = useFieldArray({
    control,
    name: 'modulos'
  });

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
        
        {/* Camada 1: Informação de Base */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="p-8 border-white/5 bg-surface/50 backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-accent/10 rounded-lg text-accent"><Layout size={20} /></div>
                <h2 className="text-xl font-bold">Estrutura Soberana</h2>
              </div>
              
              <div className="space-y-6">
                <Input label="Título do Desafio" {...register('titulo')} error={errors.titulo?.message} placeholder="Ex: Engenharia de Prompt de Elite" />
                
                <div className="space-y-1">
                  <label className="text-sm font-medium opacity-70">Manifesto do Curso</label>
                  <textarea 
                    className="flex min-h-25 w-full rounded-xl border border-white/10 bg-surface-alt px-4 py-3 text-sm focus:border-accent outline-none transition-all"
                    {...register('descricao')}
                    placeholder="O que o estudante irá conquistar?"
                  />
                  {errors.descricao && <p className="text-xs text-error">{errors.descricao.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label className="text-sm font-medium opacity-70">Área Vocacional</label>
                      <select {...register('area')} className="w-full bg-surface-alt border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-accent transition-all">
                        {AreaVocacionalSchema.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                   </div>
                   <div className="space-y-1">
                      <label className="text-sm font-medium opacity-70">Nível de Rigor</label>
                      <select {...register('nivel')} className="w-full bg-surface-alt border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-accent transition-all">
                        <option value="basico">Básico (Iniciação)</option>
                        <option value="medio">Médio (Competência)</option>
                        <option value="avancado">Avançado (Mestria)</option>
                      </select>
                   </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Camada 5: Regras de Match (O Diferencial PDC) */}
          <div className="lg:col-span-1">
            <Card className="p-8 border-accent/20 bg-accent/5 backdrop-blur-xl relative overflow-hidden h-full">
              <div className="absolute top-0 right-0 p-4 opacity-10"><Brain size={80} /></div>
              
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-accent text-white rounded-lg shadow-lg shadow-accent/20"><Brain size={20} /></div>
                <h2 className="text-xl font-bold">Gardião de Mérito</h2>
              </div>

              <p className="text-xs text-text-secondary mb-8 leading-relaxed">
                Define os requisitos biomecânicos mínimos. O **Match Terminal** apenas sugerirá este curso a estudantes que provem este nível de performance.
              </p>

              <div className="space-y-8">
                <div className="space-y-3">
                  <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-accent">
                    <span>Min. Fluidez Cognitiva</span>
                    <span>{watch('regrasAcesso.minFluidez')}/10</span>
                  </div>
                  <input type="range" min="0" max="10" step="0.5" {...register('regrasAcesso.minFluidez', { valueAsNumber: true })} className="w-full accent-accent" />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-accent">
                    <span>Min. Resiliência ao Erro</span>
                    <span>{watch('regrasAcesso.minResiliencia')}/10</span>
                  </div>
                  <input type="range" min="0" max="10" step="0.5" {...register('regrasAcesso.minResiliencia', { valueAsNumber: true })} className="w-full accent-accent" />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-accent">
                    <span>Min. Estabilidade de Foco</span>
                    <span>{watch('regrasAcesso.minFoco')}/10</span>
                  </div>
                  <input type="range" min="0" max="10" step="0.5" {...register('regrasAcesso.minFoco', { valueAsNumber: true })} className="w-full accent-accent" />
                </div>
              </div>

              <div className="mt-8 p-4 rounded-xl bg-white/5 border border-white/5 text-[10px] text-text-muted italic">
                Rigor ADR-017: A validação é soberana e automática.
              </div>
            </Card>
          </div>
        </section>

        {/* Camada 3: Módulos (Cascading Logic) */}
        <section>
          <div className="flex items-center justify-between mb-6 px-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500"><Layers size={20} /></div>
              <h2 className="text-xl font-bold">Músculo Curricular</h2>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => appendModulo({ titulo: `Novo Módulo ${modulos.length + 1}`, ordem: modulos.length + 1, itens: [{ titulo: 'Novo Conteúdo', tipo: 'texto', ordem: 1 }] })} className="gap-2">
              <Plus size={16} /> Adicionar Módulo
            </Button>
          </div>

          <div className="space-y-6">
            <AnimatePresence>
              {modulos.map((modulo, index) => (
                <motion.div
                  key={modulo.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Card className="p-6 border-white/5 bg-surface-alt/30 relative group">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center font-black text-accent">{index + 1}</div>
                      <div className="flex-1 space-y-4">
                        <div className="flex gap-4">
                          <Input className="bg-transparent border-b border-t-0 border-x-0 rounded-none focus:border-accent" {...register(`modulos.${index}.titulo`)} placeholder="Nome do Módulo" />
                          <button type="button" onClick={() => removeModulo(index)} className="text-error opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-error/10 rounded-lg">
                            <Trash2 size={20} />
                          </button>
                        </div>
                        
                        {/* Conteúdos do Módulo */}
                        <div className="pl-4 border-l-2 border-white/5 space-y-3">
                           <div className="flex items-center gap-2 text-[10px] font-black text-text-muted uppercase tracking-widest mb-2">
                             <BookOpen size={12} /> Conteúdos do Módulo
                           </div>
                           {/* Aqui poderíamos adicionar sub-fields para itens, mas para MVP E2E mantemos 1 item default */}
                           <div className="flex gap-3">
                             <select {...register(`modulos.${index}.itens.0.tipo`)} className="bg-surface border border-white/10 rounded-lg px-3 py-1 text-xs">
                               <option value="video">🎥 Vídeo</option>
                               <option value="tarefa">🛠️ Tarefa Prática</option>
                               <option value="quiz">🧠 Quiz</option>
                               <option value="texto">📄 Texto</option>
                             </select>
                             <Input className="h-8 text-xs bg-surface/50" {...register(`modulos.${index}.itens.0.titulo`)} placeholder="Título do Conteúdo" />
                           </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>

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

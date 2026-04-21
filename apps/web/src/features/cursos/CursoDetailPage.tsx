import { useEffect, useState } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Button, Spinner, Badge, EmptyState, Card } from '@/components/ui';
import { BookOpen, Lock, ShieldCheck, Zap, MessageSquare } from 'lucide-react';
import { cursosApi } from '@/lib/api/cursos';
import { useTelemetry } from '@/hooks/useTelemetry';
import { motion, AnimatePresence } from 'motion/react';
import type { ProgressoItem, Curso, Modulo, ItemModulo } from '@pdc/shared';

export function CursoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { track } = useTelemetry();
  const [showPayInfo, setShowPayInfo] = useState(false);

  useEffect(() => {
    if (id) track('curso.detail_viewed', { cursoId: id });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: curso, isLoading, isError } = useQuery<Curso>({
    queryKey: ['cursos', id ?? ''],
    queryFn: () => cursosApi.getById(id ?? ''),
    enabled: !!id,
  });

  const { data: progresso = [] } = useQuery<ProgressoItem[]>({
    queryKey: ['cursos', id ?? '', 'progresso'],
    queryFn: () => cursosApi.getProgresso(id ?? ''),
    enabled: !!id,
    retry: false,
  });

  const inscricaoMutation = useMutation({
    mutationFn: () => cursosApi.inscrever(id ?? ''),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['cursos', id ?? '', 'progresso'] });
    },
  });

  if (!id) return <Navigate to="/app/cursos" replace />;

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  
  if (isError || !curso) {
    return <div className="flex min-h-screen items-center justify-center bg-background p-4"><EmptyState icon={BookOpen} variant="error" title="Erro ao carregar o curso" description="Não foi possível carregar os dados deste curso." /></div>;
  }

  const isEnrolled = progresso.length > 0;
  const isBlockedByMerit = curso.bloqueado;
  const motivoBloqueio = curso.motivoBloqueio;
  const isPaid = !curso.gratuito;

  const handleEnrollClick = () => {
    if (isBlockedByMerit) return;
    if (isPaid && !isEnrolled) {
      setShowPayInfo(true);
      return;
    }
    inscricaoMutation.mutate();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-12 pb-32 animate-in fade-in duration-700">
      
      {/* Header Imersivo */}
      <div className="relative h-64 w-full overflow-hidden rounded-[40px] shadow-2xl border border-border bg-surface-alt">
        {curso.capaUrl ? (
          <img src={curso.capaUrl} alt={curso.titulo} className="h-full w-full object-cover opacity-60" />
        ) : (
          <div className="flex h-full items-center justify-center text-text-muted"><BookOpen size={48} /></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        
        <div className="absolute bottom-8 left-8 right-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
           <div>
             <div className="flex items-center gap-2 mb-4">
                <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20 font-black text-[10px] uppercase">{curso.area}</Badge>
                <Badge variant="outline" className="bg-surface/50 backdrop-blur-md font-bold text-[10px] uppercase">{curso.nivel}</Badge>
             </div>
             <h1 className="text-4xl font-black text-text-primary tracking-tighter sm:text-6xl font-display leading-tight">{curso.titulo}</h1>
           </div>
           
           <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-2xl bg-surface/80 backdrop-blur-md border border-border shadow-xl">
                 <p className="text-[9px] font-black uppercase text-text-muted mb-1">Duração</p>
                 <p className="text-sm font-black text-text-primary font-mono">{curso.totalHoras} Horas</p>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Lado Esquerdo: Conteúdo */}
        <div className="lg:col-span-8 space-y-8">
           <Tabs defaultValue="visao">
              <TabsList className="bg-surface-raised/50 p-1.5 rounded-2xl border border-border">
                <TabsTrigger value="visao" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest">A Trilha</TabsTrigger>
                <TabsTrigger value="detalhes" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest">Syllabus</TabsTrigger>
              </TabsList>

              <TabsContent value="visao" className="mt-8">
                <div className="space-y-6">
                   {curso.modulos?.map((mod: Modulo, idx: number) => (
                     <Card key={mod.id} className="p-6 bg-surface border-border hover:border-accent/20 transition-all rounded-3xl">
                        <div className="flex items-center gap-4 mb-4">
                           <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent font-black text-xs">{idx + 1}</div>
                           <h3 className="text-lg font-black text-text-primary tracking-tight">{mod.titulo}</h3>
                        </div>
                        <ul className="space-y-2 pl-12">
                           {mod.itens?.map((item: ItemModulo) => (
                             <li key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-raised/30 border border-border/50 text-sm">
                                <div className="flex items-center gap-3">
                                   <Zap size={14} className="text-accent" />
                                   <span className="font-medium text-text-secondary">{item.titulo}</span>
                                </div>
                                <Badge variant="outline" className="text-[9px] uppercase font-bold">{item.tipo}</Badge>
                             </li>
                           ))}
                        </ul>
                     </Card>
                   ))}
                </div>
              </TabsContent>

              <TabsContent value="detalhes" className="mt-8">
                 <Card className="p-8 bg-surface border-border rounded-[32px]">
                    <h4 className="text-xs font-black uppercase tracking-widest text-accent mb-4">Descrição do Percurso</h4>
                    <p className="leading-relaxed text-text-secondary whitespace-pre-wrap">{curso.descricao}</p>
                 </Card>
              </TabsContent>
           </Tabs>
        </div>

        {/* Lado Direito: Decisão & Mérito */}
        <div className="lg:col-span-4 space-y-8">
           <Card className="p-8 bg-surface-alt border-border rounded-[40px] shadow-2xl sticky top-8">
              <div className="space-y-6">
                 <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-2">Investimento</p>
                    <p className="text-4xl font-black text-text-primary font-mono tracking-tighter">
                       {isPaid ? `${String(curso.preco)} ${curso.moeda || 'USD'}` : 'GRATUITO'}
                    </p>
                 </div>

                 {isBlockedByMerit ? (
                   <div className="p-6 rounded-3xl bg-error/5 border border-error/20 space-y-4">
                      <div className="flex items-center gap-3 text-error">
                         <Lock size={20} />
                         <span className="text-[10px] font-black uppercase tracking-widest">Aptidão Requerida</span>
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed font-medium">
                         O teu mpetro atual é insuficiente para este curso. ({motivoBloqueio}). Realiza mais simulações para subires a tua Fluidez Cognitiva.
                      </p>
                      <Link to="/app/simulacoes">
                         <Button variant="outline" className="w-full rounded-xl border-error/20 text-error hover:bg-error/5 font-black uppercase text-[10px]">Evoluir no Oráculo</Button>
                      </Link>
                   </div>
                 ) : (
                   <AnimatePresence mode="wait">
                     {showPayInfo ? (
                       <motion.div 
                         initial={{ opacity: 0, scale: 0.95 }}
                         animate={{ opacity: 1, scale: 1 }}
                         className="p-6 rounded-3xl bg-accent/5 border border-accent/20 space-y-4"
                       >
                          <div className="flex items-center gap-3 text-accent">
                             <MessageSquare size={20} />
                             <span className="text-[10px] font-black uppercase tracking-widest">Instruções de Pagamento</span>
                          </div>
                          <p className="text-xs text-text-secondary leading-relaxed font-medium">
                             Para acederes a este percurso de elite, contacta o Mentor via e-mail ou WhatsApp para o envio do comprovativo.
                          </p>
                          <div className="space-y-2 pt-2">
                             <a href="mailto:finance@usepdc.com" className="block text-xs font-bold text-accent underline">finance@usepdc.com</a>
                             <p className="text-[10px] text-text-muted">Indica o ID do Curso: {id}</p>
                          </div>
                          <Button variant="ghost" onClick={() => { setShowPayInfo(false); }} className="w-full text-text-muted text-[9px] font-black uppercase">Voltar</Button>
                       </motion.div>
                     ) : (
                       <Button 
                         onClick={handleEnrollClick}
                         isLoading={inscricaoMutation.isPending}
                         disabled={isEnrolled}
                         className="w-full h-16 rounded-2xl bg-accent text-white font-black uppercase tracking-widest text-xs hover:scale-[1.02] shadow-xl shadow-accent/20"
                       >
                         {isEnrolled ? 'Já fazes parte da Trilha' : 'Iniciar Percurso Soberano'}
                       </Button>
                     )}
                   </AnimatePresence>
                 )}

                 <div className="pt-8 border-t border-border flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] font-black uppercase text-text-muted">Aptidão Validada</span>
                       <ShieldCheck size={16} className="text-accent" />
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold text-text-secondary">
                       <span>Certificado Digital</span>
                       <span className="text-accent">✅</span>
                    </div>
                 </div>
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
}

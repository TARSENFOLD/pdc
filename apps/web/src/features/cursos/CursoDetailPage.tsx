import { useEffect, useState } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Button, Spinner, Badge, EmptyState, Card } from '@/components/ui';
import { EditorialStateBadge } from '@/components/ui/EditorialStateBadge';
import { BookOpen, Lock, ShieldCheck, Zap, MessageSquare, CheckCircle } from 'lucide-react';
import { cursosApi } from '@/lib/api/cursos';
import { ratingsApi } from '@/lib/api/interactions';
import { useTelemetry } from '@/hooks/useTelemetry';
import { toast } from '@/hooks/useToast';
import { motion, AnimatePresence } from 'motion/react';
import type { ProgressoItem, Curso, Modulo, ItemModulo } from '@pdc/shared';
import { RatingStars } from '@/components/ui/RatingStars';

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

  const progressoQuery = useQuery<ProgressoItem[]>({
    queryKey: ['cursos', id ?? '', 'progresso'],
    queryFn: () => cursosApi.getProgresso(id ?? ''),
    enabled: !!id,
    retry: false,
  });
  const progresso = progressoQuery.data ?? [];

  const { data: ratingStats } = useQuery({
    queryKey: ['curso', id ?? '', 'ratings'],
    queryFn: () => ratingsApi.getStats('curso', id ?? ''),
    enabled: !!id,
  });

  const inscricaoMutation = useMutation({
    mutationFn: () => cursosApi.inscrever(id ?? ''),
    onSuccess: () => {
      setShowPayInfo(false);
      void qc.invalidateQueries({ queryKey: ['cursos', id ?? ''] });
      void qc.invalidateQueries({ queryKey: ['cursos', id ?? '', 'progresso'] });
    },
    onError: (err: unknown) => {
      const status = (err as { response?: { status?: number } }).response?.status;
      if (status === 409) {
        void qc.invalidateQueries({ queryKey: ['cursos', id ?? '', 'progresso'] });
        return;
      }
      toast({ title: 'Erro ao inscrever', description: 'Tente novamente mais tarde.', variant: 'error' });
    },
  });

  if (!id) return <Navigate to="/app/cursos" replace />;

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  
  if (isError || !curso) {
    return <div className="flex min-h-screen items-center justify-center bg-canvas p-4"><EmptyState icon={BookOpen} variant="error" title="Erro ao carregar o curso" description="Não foi possível carregar os dados deste curso." /></div>;
  }

  const isEnrolled = progressoQuery.data !== undefined;
  const isBlockedByMerit = curso.bloqueado;
  const motivoBloqueio = curso.motivoBloqueio;
  const isPaid = !curso.gratuito;
  const modulos = curso.modulos ?? [];
  const totalItems = modulos.reduce((total, modulo) => total + modulo.itens.length, 0);
  const completedItems = progresso.filter((item) => item.concluido).length;
  const progressoPercentual = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

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
      <div className="relative h-64 w-full overflow-hidden rounded-[40px] shadow-2xl border border-ink-tertiary/10 bg-recessed">
        {curso.capaUrl ? (
          <img src={curso.capaUrl} alt={curso.titulo} className="h-full w-full object-cover opacity-60" />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-tertiary"><BookOpen size={48} /></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        
        <div className="absolute bottom-8 left-8 right-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
           <div>
             <div className="flex items-center gap-2 mb-4">
                <EditorialStateBadge state={curso.estado} />
                <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20 font-black text-[10px] uppercase">{curso.area}</Badge>
                <Badge variant="outline" className="bg-canvas/50 backdrop-blur-md font-bold text-[10px] uppercase">{curso.nivel}</Badge>
             </div>
             <h1 className="text-4xl font-black text-ink-primary tracking-tighter sm:text-6xl font-display leading-tight">{curso.titulo}</h1>
           </div>
           
           <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-2xl bg-elevated/80 backdrop-blur-md border border-ink-tertiary/10 shadow-xl">
                 <p className="text-[9px] font-black uppercase text-ink-tertiary mb-1">Duração</p>
                 <p className="text-sm font-black text-ink-primary font-mono">{curso.totalHoras} Horas</p>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Lado Esquerdo: Conteúdo */}
        <div className="lg:col-span-8 space-y-8">
           <Tabs defaultValue="visao">
              <TabsList className="mb-6">
                <TabsTrigger value="visao">A Trilha</TabsTrigger>
                <TabsTrigger value="detalhes">Syllabus</TabsTrigger>
              </TabsList>

              <TabsContent value="visao" className="mt-8">
                <div className="space-y-6">
                   {modulos.map((mod: Modulo, idx: number) => (
                     <Card key={mod.id} className="p-6 bg-elevated border-ink-tertiary/10 hover:border-accent/20 transition-all rounded-3xl">
                        <div className="flex items-center gap-4 mb-4">
                           <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent font-black text-xs">{idx + 1}</div>
                           <h3 className="text-lg font-black text-ink-primary tracking-tight">{mod.titulo}</h3>
                        </div>
                        <ul className="space-y-2 pl-12">
                           {mod.itens.map((item: ItemModulo) => (
                             <li key={item.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-elevated/30 border border-ink-tertiary/10 text-sm">
                                <div className="flex items-center gap-3">
                                   <Zap size={14} className="text-accent" />
                                   <span className="font-medium text-ink-secondary">{item.titulo}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-[9px] uppercase font-bold">{item.tipo}</Badge>
                                  {isEnrolled ? (
                                    <Link to={`/app/cursos/${id}/itens/${item.id}`}>
                                      <Button size="sm" variant="ghost" className="h-8 text-[10px] font-black uppercase">Abrir</Button>
                                    </Link>
                                  ) : null}
                                </div>
                             </li>
                           ))}
                        </ul>
                     </Card>
                   ))}
                </div>
              </TabsContent>

              <TabsContent value="detalhes" className="mt-8">
                 <Card className="p-8 bg-elevated border-ink-tertiary/10 rounded-[32px]">
                    <h4 className="text-xs font-black uppercase tracking-widest text-accent mb-4">Descrição do Percurso</h4>
                    <p className="leading-relaxed text-ink-secondary whitespace-pre-wrap">{curso.descricao}</p>
                 </Card>
              </TabsContent>
           </Tabs>
        </div>

        {/* Lado Direito: Decisão & Mérito */}
        <div className="lg:col-span-4 space-y-8">
           <Card className="p-8 bg-recessed border-ink-tertiary/10 rounded-[40px] shadow-2xl sticky top-8">
              <div className="space-y-6">
                 <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-ink-tertiary mb-2">Investimento</p>
                    <p className="text-4xl font-black text-ink-primary font-mono tracking-tighter">
                       {isPaid ? `${String(curso.preco)} ${curso.moeda || 'USD'}` : 'GRATUITO'}
                    </p>
                 </div>

                 {isBlockedByMerit ? (
                   <div className="p-6 rounded-3xl bg-error/5 border border-error/20 space-y-4">
                      <div className="flex items-center gap-3 text-error">
                         <Lock size={20} />
                         <span className="text-[10px] font-black uppercase tracking-widest">Aptidão Requerida</span>
                      </div>
                      <p className="text-xs text-ink-secondary leading-relaxed font-medium">
                         O teu mpetro atual é insuficiente para este curso. ({motivoBloqueio}). Realiza mais simulações para subires a tua Fluidez Cognitiva.
                      </p>
                      <Link to="/app/simulacoes">
                         <Button variant="outline" className="w-full rounded-xl border-error/20 text-error hover:bg-error/5 font-black uppercase text-[10px]">Treinar Competências</Button>
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
                          <p className="text-xs text-ink-secondary leading-relaxed font-medium">
                             Para acederes a este percurso de elite, contacta o Mentor via e-mail ou WhatsApp para o envio do comprovativo.
                          </p>
                          <div className="space-y-2 pt-2">
                             <a href="mailto:finance@usepdc.com" className="block text-xs font-bold text-accent underline">finance@usepdc.com</a>
                             <p className="text-[10px] text-ink-tertiary">Indica o ID do Curso: {id}</p>
                          </div>
                          <Button variant="ghost" onClick={() => { setShowPayInfo(false); }} className="w-full text-ink-tertiary text-[9px] font-black uppercase">Voltar</Button>
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

                 <div className="pt-8 border-t border-ink-tertiary/10 flex flex-col gap-4">
                    {isEnrolled ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-ink-secondary">
                          <span>Progresso</span>
                          <span className="text-accent">{progressoPercentual}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-ink-tertiary/10">
                          <div className="h-full bg-accent" style={{ width: `${String(progressoPercentual)}%` }} />
                        </div>
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] font-black uppercase text-ink-tertiary">Aptidão Validada</span>
                       <ShieldCheck size={16} className="text-accent" />
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold text-ink-secondary">
                       <span>Certificado Digital</span>
                       <CheckCircle size={14} className="text-accent" />
                    </div>
                    <div className="space-y-2 border-t border-ink-tertiary/10 pt-4">
                      <span className="text-[10px] font-black uppercase text-ink-tertiary">Avaliação</span>
                      <RatingStars targetType="curso" targetId={id} stats={ratingStats} readOnly={!isEnrolled || progressoPercentual < 30} />
                      {isEnrolled && progressoPercentual < 30 ? (
                        <p className="text-[10px] text-ink-tertiary">Completa pelo menos 30% para avaliar.</p>
                      ) : null}
                    </div>
                 </div>
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
}

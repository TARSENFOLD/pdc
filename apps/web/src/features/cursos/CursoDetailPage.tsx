import { useEffect, useState } from 'react';
import { useParams, Navigate, Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Button, Spinner, Badge, EmptyState, Card } from '@/components/ui';
import { EditorialStateBadge } from '@/components/ui/EditorialStateBadge';
import { BookOpen, Lock, Zap, MessageSquare } from 'lucide-react';
import { cursosApi } from '@/lib/api/cursos';
import { ratingsApi } from '@/lib/api/interactions';
import { useTelemetry } from '@/hooks/useTelemetry';
import { toast } from '@/hooks/useToast';
import { motion, AnimatePresence } from 'motion/react';
import type { ProgressoItem, Curso, Modulo, ItemModulo } from '@pdc/shared';
import { RatingStars } from '@/components/ui/RatingStars';
import { countCurrentCompletedItems, isEnrollmentRequiredError } from './course-progress';
import { ApiError } from '@/lib/api/http';

export function CursoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const previewRequested = searchParams.get('preview') === 'true';
  const qc = useQueryClient();
  const { track } = useTelemetry();
  const [showPayInfo, setShowPayInfo] = useState(false);

  useEffect(() => {
    if (id) track('curso.detail_viewed', { cursoId: id });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const {
    data: curso,
    isLoading,
    isError,
  } = useQuery<Curso>({
    queryKey: ['cursos', id ?? '', previewRequested ? 'preview' : 'public'],
    queryFn: () =>
      previewRequested ? cursosApi.getPreviewById(id ?? '') : cursosApi.getById(id ?? ''),
    enabled: !!id,
  });

  const progressoQuery = useQuery<ProgressoItem[]>({
    queryKey: ['cursos', id ?? '', 'progresso'],
    queryFn: () => cursosApi.getProgresso(id ?? ''),
    enabled: !!id && !previewRequested,
    retry: false,
  });
  const progresso = progressoQuery.data ?? [];

  const { data: ratingStats } = useQuery({
    queryKey: ['curso', id ?? '', 'ratings'],
    queryFn: () => ratingsApi.getStats('curso', id ?? ''),
    enabled: !!id && !previewRequested,
  });

  const inscricaoMutation = useMutation({
    mutationFn: () => cursosApi.inscrever(id ?? ''),
    onSuccess: () => {
      setShowPayInfo(false);
      void qc.invalidateQueries({ queryKey: ['cursos', id ?? ''] });
      void qc.invalidateQueries({ queryKey: ['cursos', id ?? '', 'progresso'] });
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError && err.status === 409) {
        void qc.invalidateQueries({ queryKey: ['cursos', id ?? '', 'progresso'] });
        return;
      }
      toast({
        title: 'Erro ao inscrever',
        description: 'Tente novamente mais tarde.',
        variant: 'error',
      });
    },
  });

  if (!id) return <Navigate to="/app/cursos" replace />;

  if (isLoading)
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );

  if (isError || !curso) {
    return (
      <div className="bg-canvas flex min-h-screen items-center justify-center p-4">
        <EmptyState
          icon={BookOpen}
          variant="error"
          title="Erro ao carregar o curso"
          description="Não foi possível carregar os dados deste curso."
        />
      </div>
    );
  }

  const enrollmentRequired =
    progressoQuery.isError && isEnrollmentRequiredError(progressoQuery.error);
  const progressUnavailable = progressoQuery.isError && !enrollmentRequired;
  const isEnrolled = progressoQuery.data !== undefined;
  const isBlockedByMerit = curso.bloqueado;
  const motivoBloqueio = curso.motivoBloqueio;
  const isPaid = !curso.gratuito;
  const modulos = curso.modulos ?? [];
  const totalItems = modulos.reduce((total, modulo) => total + modulo.itens.length, 0);
  const completedItems = countCurrentCompletedItems(
    modulos.flatMap((modulo) => modulo.itens.map((item) => String(item.id))),
    progresso
  );
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
    <div className="animate-in fade-in mx-auto max-w-5xl space-y-12 pb-32 duration-700">
      {previewRequested ? (
        <div className="border-accent/30 bg-accent/5 text-ink-secondary rounded-2xl border px-5 py-4 text-sm">
          <strong className="text-ink-primary">Pré-visualização do criador.</strong> Estás a ver a
          versão ainda não publicada deste curso.
        </div>
      ) : null}
      {/* Header Imersivo */}
      <div className="border-ink-tertiary/10 bg-recessed relative h-64 w-full overflow-hidden rounded-[40px] border shadow-2xl">
        {curso.capaUrl ? (
          <img
            src={curso.capaUrl}
            alt={curso.titulo}
            className="h-full w-full object-cover opacity-60"
          />
        ) : (
          <div className="text-ink-tertiary flex h-full items-center justify-center">
            <BookOpen size={48} />
          </div>
        )}
        <div className="from-background absolute inset-0 bg-gradient-to-t via-transparent to-transparent" />

        <div className="absolute right-8 bottom-8 left-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <EditorialStateBadge state={curso.estado} />
              <Badge
                variant="secondary"
                className="bg-accent/10 text-accent border-accent/20 text-[10px] font-black uppercase"
              >
                {curso.area}
              </Badge>
              <Badge
                variant="outline"
                className="bg-canvas/50 text-[10px] font-bold uppercase backdrop-blur-md"
              >
                {curso.nivel}
              </Badge>
            </div>
            <h1 className="text-ink-primary font-display text-4xl leading-tight font-black tracking-tighter sm:text-6xl">
              {curso.titulo}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-elevated/80 border-ink-tertiary/10 rounded-2xl border px-4 py-2 shadow-xl backdrop-blur-md">
              <p className="text-ink-tertiary mb-1 text-[9px] font-black uppercase">Duração</p>
              <p className="text-ink-primary font-mono text-sm font-black">
                {curso.totalHoras} Horas
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
        {/* Lado Esquerdo: Conteúdo */}
        <div className="space-y-8 lg:col-span-8">
          <Tabs defaultValue="visao">
            <TabsList className="mb-6">
              <TabsTrigger value="visao">A Trilha</TabsTrigger>
              <TabsTrigger value="detalhes">Syllabus</TabsTrigger>
            </TabsList>

            <TabsContent value="visao" className="mt-8">
              <div className="space-y-6">
                {modulos.map((mod: Modulo, idx: number) => (
                  <Card
                    key={mod.id}
                    className="bg-elevated border-ink-tertiary/10 hover:border-accent/20 rounded-3xl p-6 transition-all"
                  >
                    <div className="mb-4 flex items-center gap-4">
                      <div className="bg-accent/10 text-accent flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black">
                        {idx + 1}
                      </div>
                      <h3 className="text-ink-primary text-lg font-black tracking-tight">
                        {mod.titulo}
                      </h3>
                    </div>
                    <ul className="space-y-2 pl-12">
                      {mod.itens.map((item: ItemModulo) => (
                        <li
                          key={item.id}
                          className="bg-elevated/30 border-ink-tertiary/10 flex items-center justify-between gap-3 rounded-xl border p-3 text-sm"
                        >
                          <div className="flex items-center gap-3">
                            <Zap size={14} className="text-accent" />
                            <span className="text-ink-secondary font-medium">{item.titulo}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[9px] font-bold uppercase">
                              {item.tipo}
                            </Badge>
                            {isEnrolled ? (
                              <Link to={`/app/cursos/${id}/itens/${item.id}`}>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-[10px] font-black uppercase"
                                >
                                  Abrir
                                </Button>
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
              <Card className="bg-elevated border-ink-tertiary/10 rounded-[32px] p-8">
                <h4 className="text-accent mb-4 text-xs font-black tracking-widest uppercase">
                  Descrição do Percurso
                </h4>
                <p className="text-ink-secondary leading-relaxed whitespace-pre-wrap">
                  {curso.descricao}
                </p>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Lado Direito: Decisão & Mérito */}
        <div className="space-y-8 lg:col-span-4">
          <Card className="bg-recessed border-ink-tertiary/10 sticky top-8 rounded-[40px] p-8 shadow-2xl">
            <div className="space-y-6">
              <div>
                <p className="text-ink-tertiary mb-2 text-[10px] font-black tracking-widest uppercase">
                  Investimento
                </p>
                <p className="text-ink-primary font-mono text-4xl font-black tracking-tighter">
                  {isPaid ? `${String(curso.preco)} ${curso.moeda || 'USD'}` : 'GRATUITO'}
                </p>
              </div>

              {isBlockedByMerit ? (
                <div className="bg-error/5 border-error/20 space-y-4 rounded-3xl border p-6">
                  <div className="text-error flex items-center gap-3">
                    <Lock size={20} />
                    <span className="text-[10px] font-black tracking-widest uppercase">
                      Aptidão Requerida
                    </span>
                  </div>
                  <p className="text-ink-secondary text-xs leading-relaxed font-medium">
                    O teu mérito atual é insuficiente para este curso. ({motivoBloqueio}). Realiza
                    mais simulações para subires a tua Fluidez Cognitiva.
                  </p>
                  <Link to="/app/simulacoes">
                    <Button
                      variant="outline"
                      className="border-error/20 text-error hover:bg-error/5 w-full rounded-xl text-[10px] font-black uppercase"
                    >
                      Treinar Competências
                    </Button>
                  </Link>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  {previewRequested ? (
                    <div className="border-accent/20 bg-accent/5 rounded-2xl border p-5 text-center">
                      <p className="text-ink-primary text-sm font-bold">Modo de pré-visualização</p>
                      <p className="text-ink-secondary mt-2 text-xs leading-relaxed">
                        Inscrição, progresso e avaliação ficam indisponíveis enquanto o curso não
                        for publicado.
                      </p>
                    </div>
                  ) : showPayInfo ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-accent/5 border-accent/20 space-y-4 rounded-3xl border p-6"
                    >
                      <div className="text-accent flex items-center gap-3">
                        <MessageSquare size={20} />
                        <span className="text-[10px] font-black tracking-widest uppercase">
                          Instruções de Pagamento
                        </span>
                      </div>
                      <p className="text-ink-secondary text-xs leading-relaxed font-medium">
                        Para acederes a este percurso de elite, contacta o Mentor via e-mail ou
                        WhatsApp para o envio do comprovativo.
                      </p>
                      <div className="space-y-2 pt-2">
                        <a
                          href="mailto:finance@usepdc.com"
                          className="text-accent block text-xs font-bold underline"
                        >
                          finance@usepdc.com
                        </a>
                        <p className="text-ink-tertiary text-[10px]">Indica o ID do Curso: {id}</p>
                      </div>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setShowPayInfo(false);
                        }}
                        className="text-ink-tertiary w-full text-[9px] font-black uppercase"
                      >
                        Voltar
                      </Button>
                    </motion.div>
                  ) : progressoQuery.isPending ? (
                    <div className="flex h-16 items-center justify-center">
                      <Spinner />
                    </div>
                  ) : progressUnavailable ? (
                    <div className="border-error/20 bg-error/5 space-y-3 rounded-2xl border p-5 text-center">
                      <p className="text-error text-sm">
                        Não foi possível verificar a tua inscrição.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          void progressoQuery.refetch();
                        }}
                      >
                        Tentar novamente
                      </Button>
                    </div>
                  ) : isEnrolled ? (
                    <Button
                      asChild
                      className="bg-accent shadow-accent/20 h-16 w-full rounded-2xl text-xs font-black tracking-widest text-white uppercase shadow-xl hover:scale-[1.02]"
                    >
                      <Link to={`/app/cursos/${id}/interior`}>
                        {completedItems > 0 ? 'Continuar curso' : 'Entrar no curso'}
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      onClick={handleEnrollClick}
                      isLoading={inscricaoMutation.isPending}
                      className="bg-accent shadow-accent/20 h-16 w-full rounded-2xl text-xs font-black tracking-widest text-white uppercase shadow-xl hover:scale-[1.02]"
                    >
                      Iniciar Percurso Soberano
                    </Button>
                  )}
                </AnimatePresence>
              )}

              <div className="border-ink-tertiary/10 flex flex-col gap-4 border-t pt-8">
                {isEnrolled ? (
                  <div className="space-y-2">
                    <div className="text-ink-secondary flex items-center justify-between text-xs font-bold">
                      <span>Progresso</span>
                      <span className="text-accent">{progressoPercentual}%</span>
                    </div>
                    <div className="bg-ink-tertiary/10 h-2 overflow-hidden rounded-full">
                      <div
                        className="bg-accent h-full"
                        style={{ width: `${String(progressoPercentual)}%` }}
                      />
                    </div>
                  </div>
                ) : null}
                {!previewRequested ? (
                  <div className="border-ink-tertiary/10 space-y-2 border-t pt-4">
                    <span className="text-ink-tertiary text-[10px] font-black uppercase">
                      Avaliação
                    </span>
                    <RatingStars
                      targetType="curso"
                      targetId={id}
                      stats={ratingStats}
                      readOnly={!isEnrolled || progressoPercentual < 30}
                    />
                    {isEnrolled && progressoPercentual < 30 ? (
                      <p className="text-ink-tertiary text-[10px]">
                        Completa pelo menos 30% para avaliar.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

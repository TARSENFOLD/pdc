import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BookOpen, Clock3, Layers3, Menu, Play } from 'lucide-react';
import { Button, Spinner } from '@/components/ui';
import { useFocusHeader } from '@/components/layout/useFocusHeader';
import { cursosApi } from '@/lib/api/cursos';
import { CoursePlayerShell } from './CoursePlayerShell';
import { countCurrentCompletedItems, isEnrollmentRequiredError } from './course-progress';

function routeId(value: unknown): string {
  return String(value);
}

export function CourseWelcomePage(): React.JSX.Element {
  const { cursoId } = useParams<{ cursoId: string }>();
  const navigate = useNavigate();
  const [curriculumOpen, setCurriculumOpen] = useState(false);
  const [curriculumCollapsed, setCurriculumCollapsed] = useState(false);

  const { data: curso, isLoading } = useQuery({
    queryKey: ['cursos', cursoId ?? ''],
    queryFn: () => cursosApi.getById(cursoId ?? ''),
    enabled: !!cursoId,
  });

  const progressoQuery = useQuery({
    queryKey: ['cursos', cursoId ?? '', 'progresso'],
    queryFn: () => cursosApi.getProgresso(cursoId ?? ''),
    enabled: !!cursoId,
    retry: false,
  });
  const progresso = progressoQuery.data ?? [];

  const allItems = curso?.modulos?.flatMap((module) => module.itens) ?? [];
  const completedCount = countCurrentCompletedItems(
    allItems.map((item) => routeId(item.id)),
    progresso,
  );
  const progressPercent = allItems.length > 0
    ? Math.round((completedCount / allItems.length) * 100)
    : 0;
  const firstIncomplete = allItems.find((item) => (
    !progresso.some((entry) => entry.itemId === routeId(item.id) && entry.concluido)
  ));
  const startItem = firstIncomplete ?? allItems[0];

  const header = useMemo(() => ({
    title: 'Visão geral',
    backTo: cursoId ? `/app/cursos/${cursoId}` : '/app/cursos',
    progress: (
      <div className="flex min-w-44 items-center gap-3">
        <div className="h-1.5 min-w-24 flex-1 overflow-hidden rounded-full bg-border">
          <div className="h-full bg-accent" style={{ width: `${String(progressPercent)}%` }} />
        </div>
        <span className="whitespace-nowrap text-xs text-ink-secondary">
          {completedCount}/{allItems.length}
        </span>
      </div>
    ),
    actions: (
      <button
        type="button"
        onClick={() => { setCurriculumOpen(true); }}
        className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-ink-secondary hover:bg-recessed lg:hidden"
        aria-label="Abrir currículo"
      >
        <Menu size={20} />
      </button>
    ),
  }), [allItems.length, completedCount, cursoId, progressPercent]);
  useFocusHeader(header);

  if (!cursoId) return <Navigate to="/app/cursos" replace />;
  if (isLoading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }
  if (!curso) {
    return <p className="py-12 text-center text-error">Curso não encontrado.</p>;
  }
  if (progressoQuery.isError && isEnrollmentRequiredError(progressoQuery.error)) {
    return <p className="py-12 text-center text-error">Inscreve-te no curso para aceder ao conteúdo.</p>;
  }
  if (progressoQuery.isError) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-error">Não foi possível carregar o progresso. Tenta novamente.</p>
        <Button type="button" variant="secondary" onClick={() => { void progressoQuery.refetch(); }}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  const openItem = (targetId: string | number) => {
    setCurriculumOpen(false);
    navigate(`/app/cursos/${cursoId}/itens/${routeId(targetId)}`);
  };
  const beginCourse = () => {
    if (startItem) openItem(startItem.id);
  };

  return (
    <CoursePlayerShell
      curso={curso}
      progresso={progresso}
      mobileOpen={curriculumOpen}
      collapsed={curriculumCollapsed}
      onCloseMobile={() => { setCurriculumOpen(false); }}
      onCollapse={() => { setCurriculumCollapsed(true); }}
      onExpand={() => { setCurriculumCollapsed(false); }}
      onOpenOverview={() => { setCurriculumOpen(false); }}
      onOpenItem={openItem}
    >
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-4 py-6 md:px-8 md:py-10">
          <section className="grid flex-1 overflow-hidden rounded-xl border border-border bg-elevated shadow-sm lg:min-h-[560px] lg:grid-cols-[1.05fr_0.95fr]">
            <div className="flex flex-col justify-between bg-[#2f4d91] px-7 py-10 text-white sm:px-10 lg:px-14 lg:py-14">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                  {curso.area ?? 'Curso'} · {curso.nivel ?? 'Percurso completo'}
                </p>
                <h1 className="mt-6 max-w-xl font-display text-4xl leading-tight sm:text-5xl lg:text-6xl">
                  {curso.titulo}
                </h1>
                <p className="mt-6 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
                  {curso.descricao}
                </p>
              </div>

              <div className="mt-10">
                <div className="mb-6 flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/75">
                  <span className="inline-flex items-center gap-2">
                    <Layers3 className="h-4 w-4" />
                    {curso.modulos?.length ?? 0} {(curso.modulos?.length ?? 0) === 1 ? 'módulo' : 'módulos'}
                  </span>
                  <span className="inline-flex items-center gap-2"><BookOpen className="h-4 w-4" />{allItems.length} {allItems.length === 1 ? 'aula' : 'aulas'}</span>
                  <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4" />{curso.totalHoras} h</span>
                </div>
                <Button
                  type="button"
                  onClick={beginCourse}
                  disabled={!startItem}
                  className="min-h-12 min-w-44 rounded-full bg-[#ff5d35] px-8 text-white hover:bg-[#e94f2b]"
                >
                  <Play className="mr-2 h-4 w-4 fill-current" />
                  {completedCount > 0 ? 'Continuar' : 'Começar'}
                </Button>
              </div>
            </div>

            <div className="relative min-h-72 bg-recessed lg:min-h-full">
              {curso.capaUrl ? (
                <img src={curso.capaUrl} alt={`Capa do curso ${curso.titulo}`} className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-accent/20 via-recessed to-[#2f4d91]/20 px-8 text-center">
                  <span className="flex h-20 w-20 items-center justify-center rounded-full bg-elevated text-accent shadow-lg">
                    <BookOpen className="h-9 w-9" />
                  </span>
                  <p className="max-w-xs font-display text-2xl text-ink-primary">A tua aprendizagem começa aqui.</p>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-6 pt-20 text-white">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/70">Próxima aula</p>
                <p className="mt-1 text-lg font-semibold">{startItem?.titulo ?? 'Currículo em preparação'}</p>
              </div>
            </div>
          </section>

          <div className="mt-5 flex items-center justify-between border-t border-border pt-5">
            <p className="hidden text-sm text-ink-secondary sm:block">Explora os módulos na coluna lateral ou segue pela ordem sugerida.</p>
            <Button type="button" variant="secondary" onClick={beginCourse} disabled={!startItem} className="ml-auto">
              Ir para a primeira aula
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </main>
    </CoursePlayerShell>
  );
}

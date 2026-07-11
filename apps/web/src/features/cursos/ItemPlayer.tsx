import type { ReactElement } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Spinner } from '@/components/ui';
import { cursosApi } from '@/lib/api/cursos';
import { aiApi } from '@/lib/api/ai';
import { QuizPlayer } from '@/features/ai/QuizPlayer';
import type { ItemModulo } from '@pdc/shared';
import { Check, ChevronLeft, ChevronRight, Circle } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ItemPlayerHeader } from './ItemPlayerHeader';
import { CourseVideoPlayer } from './CourseVideoPlayer';

function ExternalLink({ url, label }: { url: string; label: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-10 items-center rounded-md bg-accent px-6 text-sm font-semibold text-background hover:bg-accent-terracotta-soft"
    >
      {label} →
    </a>
  );
}

function renderItem(item: ItemModulo, courseId: string): ReactElement {
  const url = item.url ?? item.conteudo ?? '';
  switch (item.tipo) {
    case 'video':
      return (
        <div className="aspect-video w-full overflow-hidden rounded-lg">
          <CourseVideoPlayer src={url} {...(item.videoId ? { videoId: item.videoId } : {})} courseId={courseId} />
        </div>
      );
    case 'pdf':
      return <iframe src={url} className="h-[70vh] w-full rounded-lg border-0" title="PDF" />;
    case 'texto':
      return (
        <div className="rounded-lg border border-ink-tertiary/10 bg-elevated p-6 text-ink-secondary leading-relaxed whitespace-pre-wrap">
          {item.conteudo}
        </div>
      );
    case 'iframe':
      return <iframe src={url} className="h-[70vh] w-full rounded-lg border-0" title="Conteúdo" />;
    case 'quiz':
      return <></>;
    case 'tarefa':
      return <ExternalLink url={url} label="Abrir Tarefa" />;
  }
}

function routeId(value: unknown): string {
  return String(value);
}

export function ItemPlayer() {
  const { cursoId, itemId } = useParams<{ cursoId: string; itemId: string }>();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [curriculumOpen, setCurriculumOpen] = useState(false);

  const { data: curso, isLoading } = useQuery({
    queryKey: ['cursos', cursoId ?? ''],
    queryFn: () => cursosApi.getById(cursoId ?? ''),
    enabled: !!cursoId,
  });

  const { data: progresso = [], isError: progressoError } = useQuery({
    queryKey: ['cursos', cursoId ?? '', 'progresso'],
    queryFn: () => cursosApi.getProgresso(cursoId ?? ''),
    enabled: !!cursoId,
    retry: false,
  });

  const marcarMutation = useMutation({
    mutationFn: () => cursosApi.updateProgresso(cursoId ?? '', itemId ?? '', true),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['cursos', cursoId ?? '', 'progresso'] });
      navigate(`/app/cursos/${cursoId ?? ''}`);
    },
  });

  if (!cursoId || !itemId) return <Navigate to="/app/cursos" replace />;

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }
  if (!curso) {
    return <p className="py-12 text-center text-error">Curso não encontrado.</p>;
  }
  if (progressoError) {
    return <p className="py-12 text-center text-error">Inscreve-te no curso para aceder ao player.</p>;
  }

  const item = curso.modulos?.flatMap((m) => m.itens).find((i) => routeId(i.id) === itemId);
  const moduloId = curso.modulos?.find((m) => m.itens.some((i) => routeId(i.id) === itemId))?.id;
  if (!item) {
    return <p className="py-12 text-center text-error">Item não encontrado.</p>;
  }

  const concluido = progresso.some((p) => p.itemId === itemId && p.concluido);
  const allItems = curso.modulos?.flatMap((modulo) =>
    modulo.itens.map((moduleItem) => ({ item: moduleItem, modulo }))
  ) ?? [];
  const currentIndex = allItems.findIndex(({ item: moduleItem }) => routeId(moduleItem.id) === itemId);
  const previousItem = currentIndex > 0 ? allItems[currentIndex - 1]?.item : undefined;
  const nextItem = currentIndex >= 0 ? allItems[currentIndex + 1]?.item : undefined;
  const completedCount = progresso.filter((entry) => entry.concluido).length;
  const progressPercent = allItems.length > 0 ? Math.round((completedCount / allItems.length) * 100) : 0;

  const openItem = (targetId: string | number) => {
    setCurriculumOpen(false);
    navigate(`/app/cursos/${cursoId}/itens/${routeId(targetId)}`);
  };

  return (
    <div className="relative flex min-h-[calc(100vh-64px)] bg-canvas">
      <ItemPlayerHeader
        cursoId={cursoId}
        title={item.titulo}
        completedCount={completedCount}
        totalCount={allItems.length}
        progressPercent={progressPercent}
        concluded={concluido}
        pending={marcarMutation.isPending}
        onOpenCurriculum={() => { setCurriculumOpen(true); }}
        onComplete={() => { marcarMutation.mutate(); }}
      />
      <aside className={cn(
        'absolute inset-y-0 left-0 z-30 w-[300px] border-r border-border bg-recessed transition-transform lg:relative lg:translate-x-0',
        curriculumOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
        <div className="border-b border-border px-5 py-6">
          <h2 className="line-clamp-2 font-semibold text-ink-primary">{curso.titulo}</h2>
          <div className="mt-4 flex items-center justify-between text-xs text-ink-secondary">
            <span>{completedCount} de {allItems.length} concluídos</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
            <div className="h-full bg-accent transition-all" style={{ width: `${String(progressPercent)}%` }} />
          </div>
        </div>

        <nav className="h-[calc(100vh-180px)] overflow-y-auto p-3" aria-label="Currículo do curso">
          {curso.modulos?.map((module, moduleIndex) => (
            <section key={module.id} className="mb-5">
              <div className="px-3 pb-2">
                <p className="text-xs font-semibold text-ink-primary">Módulo {moduleIndex + 1}</p>
                <p className="mt-1 text-xs text-ink-tertiary">{module.titulo}</p>
              </div>
              <div className="space-y-1">
                {module.itens.map((moduleItem, itemIndex) => {
                  const moduleItemId = routeId(moduleItem.id);
                  const isCurrent = moduleItemId === itemId;
                  const isComplete = progresso.some((entry) => entry.itemId === moduleItemId && entry.concluido);
                  return (
                    <button
                      key={moduleItemId}
                      type="button"
                      onClick={() => { openItem(moduleItem.id); }}
                      className={cn(
                        'flex min-h-12 w-full items-start gap-3 rounded-sm px-3 py-2 text-left transition-colors',
                        isCurrent ? 'bg-accent/10 text-accent' : 'text-ink-secondary hover:bg-elevated hover:text-ink-primary',
                      )}
                    >
                      {isComplete ? <Check className="mt-0.5 h-4 w-4 shrink-0" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0" />}
                      <span>
                        <span className="block text-xs text-ink-tertiary">{moduleIndex + 1}.{itemIndex + 1} · {moduleItem.tipo}</span>
                        <span className="mt-0.5 block text-sm font-medium">{moduleItem.titulo}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </nav>
      </aside>

      {curriculumOpen && (
        <button type="button" aria-label="Fechar currículo" className="absolute inset-0 z-20 bg-black/50 lg:hidden" onClick={() => { setCurriculumOpen(false); }} />
      )}

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <article className="mx-auto w-full max-w-5xl px-4 py-8 md:px-10 md:py-12">
            <div className="mb-7 border-b border-border pb-5">
              <p className="text-xs font-semibold uppercase text-accent">{item.tipo}</p>
              <h2 className="mt-2 font-display text-2xl text-ink-primary">{item.titulo}</h2>
            </div>
            {item.tipo === 'quiz' ? (
              <QuizSection cursoId={cursoId} moduloId={moduloId ?? ''} />
            ) : (
              renderItem(item, cursoId)
            )}
          </article>
        </div>

        <footer className="flex min-h-16 items-center justify-between border-t border-border bg-canvas px-4 md:px-6">
          <Button type="button" variant="ghost" disabled={!previousItem} onClick={() => { if (previousItem) openItem(previousItem.id); }}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Anterior
          </Button>
          <span className="hidden text-xs text-ink-tertiary sm:block">
            Conteúdo {currentIndex + 1} de {allItems.length}
          </span>
          <Button type="button" variant="secondary" disabled={!nextItem} onClick={() => { if (nextItem) openItem(nextItem.id); }}>
            Seguinte
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </footer>
      </main>
    </div>
  );
}

import { EmptyState } from '@/components/ui/EmptyState';
import { AlertCircle } from 'lucide-react';

function QuizSection({ cursoId, moduloId }: { cursoId: string; moduloId: string }) {
  const { data: perguntas, isLoading, isError } = useQuery({
    queryKey: ['quiz', cursoId, moduloId],
    queryFn: () => aiApi.quiz(cursoId, moduloId),
  });

  if (isLoading) return <div className="flex justify-center py-8"><Spinner size="lg" /></div>;
  if (isError || !perguntas?.length) {
    return <EmptyState icon={AlertCircle} title="Quiz indisponível" description="Não foi possível gerar o quiz para este módulo." />;
  }
  return <QuizPlayer perguntas={perguntas} />;
}

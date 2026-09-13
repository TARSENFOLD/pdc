import type { ReactElement } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Spinner } from '@/components/ui';
import { cursosApi } from '@/lib/api/cursos';
import { aiApi } from '@/lib/api/ai';
import { QuizPlayer } from '@/features/ai/QuizPlayer';
import { safeRenderableUrl, type ItemModulo } from '@pdc/shared';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { ItemPlayerHeader } from './ItemPlayerHeader';
import { CourseVideoPlayer } from './CourseVideoPlayer';
import { CourseItemGallery } from './CourseItemGallery';
import { CoursePlayerShell } from './CoursePlayerShell';
import { countCurrentCompletedItems, isEnrollmentRequiredError } from './course-progress';

function ItemText({ content }: { content: string | undefined }): ReactElement | null {
  if (!content) return null;
  return (
    <div className="border-ink-tertiary/10 bg-elevated text-ink-secondary rounded-lg border p-6 leading-relaxed whitespace-pre-wrap">
      {content}
    </div>
  );
}

function ItemTextOrLink({
  content,
  url,
}: {
  content: string | undefined;
  url: string;
}): ReactElement {
  if (content) return <ItemText content={content} />;
  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="border-border text-accent hover:border-accent inline-flex min-h-11 items-center rounded-sm border px-4 text-sm font-semibold"
      >
        Abrir material da aula
      </a>
    );
  }
  return <p className="text-ink-tertiary text-sm">Esta aula ainda não tem conteúdo disponível.</p>;
}

function renderItem(item: ItemModulo, courseId: string): ReactElement {
  const url = safeRenderableUrl(item.url, { allowLocalHttp: import.meta.env.DEV }) ?? '';
  switch (item.tipo) {
    case 'video': {
      return (
        <div className="space-y-6">
          {item.videoId || url ? (
            <div className="aspect-video w-full overflow-hidden rounded-lg">
              <CourseVideoPlayer
                src={url}
                {...(item.videoId ? { videoId: item.videoId } : {})}
                courseId={courseId}
              />
            </div>
          ) : (
            <p className="text-ink-tertiary text-sm">
              O vídeo desta aula não tem um endereço seguro disponível.
            </p>
          )}
          <CourseItemGallery images={item.imagens ?? []} />
          <ItemText content={item.conteudo} />
        </div>
      );
    }
    case 'pdf':
      return (
        <div className="space-y-6">
          {url ? (
            <iframe src={url} className="h-[70vh] w-full rounded-lg border-0" title="PDF" />
          ) : (
            <p className="text-ink-tertiary text-sm">
              O documento desta aula não tem um endereço seguro disponível.
            </p>
          )}
          <ItemText content={item.conteudo} />
        </div>
      );
    case 'texto':
      return <ItemTextOrLink content={item.conteudo} url={url} />;
    case 'iframe':
      return url ? (
        <iframe src={url} className="h-[70vh] w-full rounded-lg border-0" title="Conteúdo" />
      ) : (
        <p className="text-ink-tertiary text-sm">
          O conteúdo externo não tem um endereço seguro disponível.
        </p>
      );
    case 'quiz':
      return <></>;
    case 'tarefa':
      return <ItemTextOrLink content={item.conteudo} url={url} />;
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
  const [curriculumCollapsed, setCurriculumCollapsed] = useState(false);

  const cursoQuery = useQuery({
    queryKey: ['cursos', cursoId ?? ''],
    queryFn: () => cursosApi.getById(cursoId ?? ''),
    enabled: !!cursoId,
  });
  const curso = cursoQuery.data;

  const progressoQuery = useQuery({
    queryKey: ['cursos', cursoId ?? '', 'progresso'],
    queryFn: () => cursosApi.getProgresso(cursoId ?? ''),
    enabled: !!cursoId,
    retry: false,
  });
  const progresso = progressoQuery.data ?? [];

  const marcarMutation = useMutation({
    mutationFn: () => cursosApi.updateProgresso(cursoId ?? '', itemId ?? '', true),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['cursos', cursoId ?? '', 'progresso'] });
      navigate(`/app/cursos/${cursoId ?? ''}`);
    },
  });

  if (!cursoId || !itemId) return <Navigate to="/app/cursos" replace />;

  if (cursoQuery.isPending || (!cursoQuery.isError && progressoQuery.isPending)) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }
  if (cursoQuery.isError) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-error">Não foi possível carregar o curso. Tenta novamente.</p>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            void cursoQuery.refetch();
          }}
        >
          Tentar novamente
        </Button>
      </div>
    );
  }
  if (!curso) {
    return <p className="text-error py-12 text-center">Curso não encontrado.</p>;
  }
  if (progressoQuery.isError && isEnrollmentRequiredError(progressoQuery.error)) {
    return (
      <p className="text-error py-12 text-center">Inscreve-te no curso para aceder ao player.</p>
    );
  }
  if (progressoQuery.isError) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-error">Não foi possível carregar o progresso. Tenta novamente.</p>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            void progressoQuery.refetch();
          }}
        >
          Tentar novamente
        </Button>
      </div>
    );
  }

  const item = curso.modulos?.flatMap((m) => m.itens).find((i) => routeId(i.id) === itemId);
  const moduloId = curso.modulos?.find((m) => m.itens.some((i) => routeId(i.id) === itemId))?.id;
  if (!item) {
    return <p className="text-error py-12 text-center">Item não encontrado.</p>;
  }

  const concluido = progresso.some((p) => p.itemId === itemId && p.concluido);
  const allItems =
    curso.modulos?.flatMap((modulo) =>
      modulo.itens.map((moduleItem) => ({ item: moduleItem, modulo }))
    ) ?? [];
  const currentIndex = allItems.findIndex(
    ({ item: moduleItem }) => routeId(moduleItem.id) === itemId
  );
  const previousItem = currentIndex > 0 ? allItems[currentIndex - 1]?.item : undefined;
  const nextItem = currentIndex >= 0 ? allItems[currentIndex + 1]?.item : undefined;
  const completedCount = countCurrentCompletedItems(
    allItems.map(({ item: moduleItem }) => routeId(moduleItem.id)),
    progresso
  );
  const progressPercent =
    allItems.length > 0 ? Math.round((completedCount / allItems.length) * 100) : 0;

  const openItem = (targetId: string | number) => {
    setCurriculumOpen(false);
    navigate(`/app/cursos/${cursoId}/itens/${routeId(targetId)}`);
  };

  const openOverview = () => {
    setCurriculumOpen(false);
    navigate(`/app/cursos/${cursoId}/interior`);
  };

  return (
    <CoursePlayerShell
      curso={curso}
      progresso={progresso}
      activeItemId={itemId}
      mobileOpen={curriculumOpen}
      collapsed={curriculumCollapsed}
      onCloseMobile={() => {
        setCurriculumOpen(false);
      }}
      onCollapse={() => {
        setCurriculumCollapsed(true);
      }}
      onExpand={() => {
        setCurriculumCollapsed(false);
      }}
      onOpenOverview={openOverview}
      onOpenItem={openItem}
    >
      <ItemPlayerHeader
        cursoId={cursoId}
        title={item.titulo}
        completedCount={completedCount}
        totalCount={allItems.length}
        progressPercent={progressPercent}
        concluded={concluido}
        pending={marcarMutation.isPending}
        onOpenCurriculum={() => {
          setCurriculumOpen(true);
        }}
        onComplete={() => {
          marcarMutation.mutate();
        }}
      />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <article className="mx-auto w-full max-w-5xl px-4 py-8 md:px-10 md:py-12">
            <div className="border-border mb-7 border-b pb-5">
              <p className="text-accent text-xs font-semibold uppercase">{item.tipo}</p>
              <h2 className="font-display text-ink-primary mt-2 text-2xl">{item.titulo}</h2>
            </div>
            {item.tipo === 'video' ? (
              renderItem(item, cursoId)
            ) : (
              <div className="space-y-6">
                <CourseItemGallery images={item.imagens ?? []} />
                {item.tipo === 'quiz' ? (
                  <QuizSection cursoId={cursoId} moduloId={moduloId ?? ''} />
                ) : (
                  renderItem(item, cursoId)
                )}
              </div>
            )}
          </article>
        </div>

        <footer className="border-border bg-canvas flex min-h-16 items-center justify-between border-t px-4 md:px-6">
          <Button
            type="button"
            variant="ghost"
            disabled={!previousItem}
            onClick={() => {
              if (previousItem) openItem(previousItem.id);
            }}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Anterior
          </Button>
          <span className="text-ink-tertiary hidden text-xs sm:block">
            Conteúdo {currentIndex + 1} de {allItems.length}
          </span>
          <Button
            type="button"
            variant="secondary"
            disabled={!nextItem}
            onClick={() => {
              if (nextItem) openItem(nextItem.id);
            }}
          >
            Seguinte
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </footer>
      </main>
    </CoursePlayerShell>
  );
}

import { EmptyState } from '@/components/ui/EmptyState';
import { AlertCircle } from 'lucide-react';

function QuizSection({ cursoId, moduloId }: { cursoId: string; moduloId: string }) {
  const {
    data: perguntas,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['quiz', cursoId, moduloId],
    queryFn: () => aiApi.quiz(cursoId, moduloId),
  });

  if (isLoading)
    return (
      <div className="flex justify-center py-8">
        <Spinner size="lg" />
      </div>
    );
  if (isError || !perguntas?.length) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Quiz indisponível"
        description="Não foi possível gerar o quiz para este módulo."
      />
    );
  }
  return <QuizPlayer perguntas={perguntas} />;
}

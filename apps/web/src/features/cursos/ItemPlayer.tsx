import type { ReactElement } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Spinner } from '@/components/ui';
import { cursosApi } from '@/lib/api/cursos';
import { aiApi } from '@/lib/api/ai';
import { QuizPlayer } from '@/features/ai/QuizPlayer';
import type { ItemModulo } from '@pdc/shared';

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

function VideoPlayer({ src }: { src: string }) {
  const isYoutube = src.includes('youtube.com') || src.includes('youtu.be');
  if (isYoutube) {
    const videoId = (() => {
      try {
        return new URL(src).searchParams.get('v') ?? src.split('/').at(-1) ?? '';
      } catch {
        return src.split('/').at(-1) ?? '';
      }
    })();
    return (
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        className="h-full w-full rounded-lg"
        allowFullScreen
        title="Vídeo"
      />
    );
  }
  return <video src={src} controls className="h-full w-full rounded-lg" />;
}

function renderItem(item: ItemModulo): ReactElement {
  const url = item.url ?? item.conteudo ?? '';
  switch (item.tipo) {
    case 'video':
      return (
        <div className="aspect-video w-full overflow-hidden rounded-lg">
          <VideoPlayer src={url} />
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

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-xl font-bold text-ink-primary">{item.titulo}</h1>
      <p className="mb-6 text-xs uppercase tracking-wider text-ink-tertiary">{item.tipo}</p>
      <div className="mb-8">
        {item.tipo === 'quiz' ? (
          <QuizSection cursoId={cursoId} moduloId={moduloId ?? ''} />
        ) : (
          renderItem(item)
        )}
      </div>
      <Button
        onClick={() => { marcarMutation.mutate(); }}
        isLoading={marcarMutation.isPending}
        disabled={concluido}
        variant={concluido ? 'secondary' : 'primary'}
      >
        {concluido ? '✓ Concluído' : 'Marcar como concluído'}
      </Button>
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

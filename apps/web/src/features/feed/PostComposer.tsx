import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Image as ImageIcon, LoaderCircle, Send, Video, X } from 'lucide-react';
import { CriarPostPayloadSchema, type CriarPostPayload } from '@pdc/shared';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { feedApi } from '@/lib/api/feed';
import { mediaApi } from '@/lib/api/media';
import { toast } from '@/hooks/useToast';
import BuilderShell from '@/components/builders/BuilderShell';
import BuilderSection from '@/components/builders/BuilderSection';

interface PostComposerFormProps {
  variant?: 'page' | 'inline';
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Não foi possível publicar.';
}

export function PostComposerForm({ variant = 'page' }: PostComposerFormProps): React.ReactElement {
  const { t } = useTranslation();
  const [corpo, setCorpo] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isInline = variant === 'inline';

  const mutation = useMutation({
    mutationFn: (payload: CriarPostPayload) => feedApi.createPost(payload),
    onSuccess: (post) => {
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      setCorpo('');
      setMediaUrls([]);
      toast({
        title: post.estado === 'aprovada' ? 'Publicação no feed' : 'Publicação em revisão',
        description: post.estado === 'aprovada'
          ? 'A tua publicação já está disponível para a comunidade.'
          : 'A tua publicação será revista antes de aparecer no feed.',
        variant: 'success',
      });
      if (!isInline) {
        navigate('/app/feed', { replace: true });
      }
    },
    onError: (error: unknown) => {
      toast({
        title: 'Falha ao publicar',
        description: errorMessage(error),
        variant: 'error',
      });
    },
  });
  const uploadMutation = useMutation({
    mutationFn: (file: File) => mediaApi.upload(file, 'post-media'),
    onSuccess: (result) => {
      setMediaUrls((current) => [...current, result.url].slice(0, 10));
    },
    onError: (error: unknown) => {
      toast({
        title: 'Falha no anexo',
        description: errorMessage(error),
        variant: 'error',
      });
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = CriarPostPayloadSchema.safeParse({ corpo, mediaUrls });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? 'Publicação inválida.');
      return;
    }

    setValidationError(null);
    mutation.mutate(parsed.data);
  }

  function handleFile(file: File | undefined) {
    if (!file || mediaUrls.length >= 10 || uploadMutation.isPending) return;
    uploadMutation.mutate(file);
  }

  const form = (
    <Card className={isInline ? 'p-4 border-[var(--chrome-border)] bg-[var(--chrome-surface)] rounded-sm' : 'p-6 bg-[var(--chrome-surface)] border-[var(--chrome-border)] rounded-sm'}>
      <form id={isInline ? undefined : 'post-composer-form'} className="space-y-4" onSubmit={handleSubmit}>
        <div className="relative">
          {!isInline && (
            <label htmlFor="post-corpo" className="block text-xs font-bold uppercase tracking-widest text-[var(--ink-tertiary)] mb-2">
              {t('feed.publicacao', 'Publicação')}
            </label>
          )}
          <textarea
            id={isInline ? 'feed-post-corpo' : 'post-corpo'}
            value={corpo}
            onChange={(event) => { setCorpo(event.target.value); }}
            rows={isInline ? 2 : 8}
            maxLength={2000}
            className="min-h-[90px] w-full resize-y rounded-md border border-[var(--chrome-border)] bg-[var(--surface-elevated)] p-4 pb-8 text-sm text-[var(--ink-primary)] outline-none transition-colors placeholder:text-[var(--ink-tertiary)] focus:border-[var(--accent-terracotta)] focus:ring-1 focus:ring-[var(--accent-terracotta)]"
            placeholder={t('feed.composerPlaceholder', 'Partilha uma experiência, conquista ou reflexão com a comunidade...')}
          />
          <div className="absolute bottom-3 right-4 flex items-center gap-4 text-[10px] font-bold text-[var(--ink-tertiary)] tracking-widest">
            {validationError && <span className="text-red-500 uppercase">{validationError}</span>}
            <span>{corpo.length.toLocaleString('pt-PT')} / 2 000</span>
          </div>
        </div>

        {mediaUrls.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {mediaUrls.map((url) => {
              const isVideo = /\.mp4(?:$|\?)/i.test(url);
              return (
                <div key={url} className="relative aspect-video overflow-hidden rounded-sm border border-[var(--chrome-border)] bg-black">
                  {isVideo ? (
                    <video src={url} className="h-full w-full object-cover" controls preload="metadata" />
                  ) : (
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  )}
                  <button
                    type="button"
                    aria-label="Remover anexo"
                    onClick={() => { setMediaUrls((current) => current.filter((item) => item !== url)); }}
                    className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-sm bg-black/80 text-white"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-between items-center mt-2">
          <div className="flex items-center gap-2 bg-[var(--surface-elevated)] border border-[var(--chrome-border)] rounded-md px-1 py-1">
            <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(event) => { handleFile(event.target.files?.[0]); event.target.value = ''; }} />
            <input ref={videoInputRef} type="file" accept="video/mp4" className="hidden" onChange={(event) => { handleFile(event.target.files?.[0]); event.target.value = ''; }} />
            <button type="button" onClick={() => { imageInputRef.current?.click(); }} disabled={uploadMutation.isPending || mediaUrls.length >= 10} className="text-[var(--ink-tertiary)] hover:text-[var(--ink-primary)] hover:bg-[var(--chrome-surface)] transition-colors flex items-center gap-2 px-3 py-1.5 rounded-sm text-[11px] font-bold tracking-widest uppercase disabled:opacity-50">
              {uploadMutation.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <ImageIcon size={14} />}
              {t('feed.addPhoto', 'Foto')}
            </button>
            <div className="w-[1px] h-4 bg-[var(--chrome-border)]"></div>
            <button type="button" onClick={() => { videoInputRef.current?.click(); }} disabled={uploadMutation.isPending || mediaUrls.length >= 10} className="text-[var(--ink-tertiary)] hover:text-[var(--ink-primary)] hover:bg-[var(--chrome-surface)] transition-colors flex items-center justify-center px-3 py-1.5 rounded-sm disabled:opacity-50" title={t('feed.addVideo', 'Adicionar vídeo')}>
              <Video size={14} />
            </button>
          </div>
          {isInline && (
            <Button
              type="submit"
              isLoading={mutation.isPending}
              disabled={corpo.trim().length === 0 || uploadMutation.isPending}
              className="h-8 rounded-md bg-[var(--accent-terracotta)] px-6 text-[11px] font-bold uppercase tracking-widest text-white shadow-sm hover:bg-[var(--accent-terracotta-soft)]"
            >
              {t('feed.postButton', 'Publicar')}
            </Button>
          )}
        </div>
      </form>
    </Card>
  );

  if (isInline) {
    return form;
  }

  return (
    <>
      <BuilderShell
        title="Criar publicação"
        description="Partilha uma experiência, conquista ou reflexão com a comunidade PDC."
        breadcrumbs={[{ label: 'Feed', to: '/app/feed' }, { label: 'Nova publicação' }]}
        sections={[{ id: 'conteudo', label: 'Conteúdo' }]}
        actions={(
          <div className="sticky top-6 space-y-4">
            <div>
              <p className="text-sm font-semibold text-ink-primary">Publicação</p>
              <p className="mt-1 text-xs leading-5 text-ink-tertiary">O conteúdo aprovado aparece imediatamente no feed.</p>
            </div>
            <Button
              type="submit"
              form="post-composer-form"
              isLoading={mutation.isPending}
              disabled={corpo.trim().length === 0 || uploadMutation.isPending}
              className="h-11 w-full rounded-sm bg-accent font-semibold text-white"
            >
              <Send size={16} className="mr-2" />
              Publicar
            </Button>
          </div>
        )}
      >
        <BuilderSection
          value="conteudo"
          title="Conteúdo da publicação"
          description="Escreve com clareza e adiciona imagens ou vídeo quando ajudarem a contar a história."
        >
          {form}
        </BuilderSection>
      </BuilderShell>
    </>
  );
}

export default function PostComposer(): React.ReactElement {
  return <PostComposerForm />;
}

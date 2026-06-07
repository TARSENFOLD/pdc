import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Image as ImageIcon, Video } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { CriarPostPayloadSchema, type CriarPostPayload } from '@pdc/shared';
import { EcosystemImpactPanel } from '@/components/ecosystem/EcosystemImpactPanel';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { feedApi } from '@/lib/api/feed';
import { toast } from '@/hooks/useToast';

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
  const [lastEventId, setLastEventId] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isInline = variant === 'inline';

  const mutation = useMutation({
    mutationFn: (payload: CriarPostPayload) => feedApi.createPost(payload),
    onSuccess: (post) => {
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      setCorpo('');
      if (post.estado === 'aprovada' && post.eventId) {
        setLastEventId(post.eventId);
      }
      toast({
        title: post.estado === 'aprovada' ? 'Publicação no feed' : 'Publicação em revisão',
        description: post.estado === 'aprovada'
          ? 'A tua publicação já está disponível para a comunidade.'
          : 'A tua publicação será revista antes de aparecer no feed.',
        variant: 'success',
      });
      if (!isInline && (post.estado !== 'aprovada' || !post.eventId)) {
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

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = CriarPostPayloadSchema.safeParse({ corpo, mediaUrls: [] });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? 'Publicação inválida.');
      return;
    }

    setValidationError(null);
    mutation.mutate(parsed.data);
  }

  const form = (
    <Card className={isInline ? 'p-4 border-[var(--chrome-border)] bg-[var(--chrome-surface)] rounded-sm' : 'p-6 bg-[var(--chrome-surface)] border-[var(--chrome-border)] rounded-sm'}>
      <form className="space-y-4" onSubmit={handleSubmit}>
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

        <div className="flex justify-between items-center mt-2">
          {isInline ? (
            <div className="flex items-center gap-2 bg-[var(--surface-elevated)] border border-[var(--chrome-border)] rounded-md px-1 py-1">
              <button type="button" onClick={() => toast({ title: 'Em breve', description: 'Funcionalidade de anexo em desenvolvimento.', variant: 'info' })} className="text-[var(--ink-tertiary)] hover:text-[var(--ink-primary)] hover:bg-[var(--chrome-surface)] transition-colors flex items-center gap-2 px-3 py-1.5 rounded-sm text-[11px] font-bold tracking-widest uppercase">
                <ImageIcon size={14} />
                {t('feed.addPhoto', 'Add Photo')}
              </button>
              <div className="w-[1px] h-4 bg-[var(--chrome-border)]"></div>
              <button type="button" onClick={() => toast({ title: 'Em breve', description: 'Funcionalidade de anexo em desenvolvimento.', variant: 'info' })} className="text-[var(--ink-tertiary)] hover:text-[var(--ink-primary)] hover:bg-[var(--chrome-surface)] transition-colors flex items-center justify-center px-3 py-1.5 rounded-sm" title={t('feed.addVideo', 'Adicionar Vídeo')}>
                <Video size={14} />
              </button>
            </div>
          ) : <div />}
          <Button 
            type="submit" 
            isLoading={mutation.isPending} 
            disabled={corpo.trim().length === 0}
            className="rounded-md bg-[var(--accent-terracotta)] hover:bg-[var(--accent-terracotta-soft)] text-white h-8 px-6 text-[11px] font-bold uppercase tracking-widest shadow-sm"
          >
            {t('feed.postButton', 'POST')}
          </Button>
        </div>
      </form>
    </Card>
  );

  if (isInline) {
    return (
      <>
        {form}
        <ComposerImpactOverlay
          eventId={lastEventId}
          onComplete={() => { setLastEventId(null); }}
        />
      </>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/app/feed">
              <ArrowLeft size={16} className="mr-1" />
              Voltar ao Feed
            </Link>
          </Button>
        </div>

        <div className="space-y-1">
          <h1 className="font-display text-3xl font-black tracking-tight text-ink-primary" data-testid="page-hero-title">
            Criar publicação
          </h1>
          <p className="text-sm text-ink-secondary">
            Partilha uma experiência, conquista ou reflexão com a comunidade PDC.
          </p>
        </div>

        {form}
      </div>
      <ComposerImpactOverlay
        eventId={lastEventId}
        onComplete={() => {
          setLastEventId(null);
          navigate('/app/feed', { replace: true });
        }}
      />
    </>
  );
}

function ComposerImpactOverlay({ eventId, onComplete }: { eventId: string | null; onComplete: () => void }): React.ReactElement {
  return (
    <AnimatePresence>
      {eventId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-canvas/95 p-6 backdrop-blur-md"
        >
          <div className="w-full max-w-xl">
            <EcosystemImpactPanel eventId={eventId} variant="full" onComplete={onComplete} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function PostComposer(): React.ReactElement {
  return <PostComposerForm />;
}

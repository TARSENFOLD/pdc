import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send } from 'lucide-react';
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
      if (post.eventId) setLastEventId(post.eventId);
      toast({
        title: post.estado === 'aprovada' ? 'Publicação no feed' : 'Publicação em revisão',
        description: post.estado === 'aprovada'
          ? 'A tua publicação já está disponível para a comunidade.'
          : 'A tua publicação será revista antes de aparecer no feed.',
        variant: 'success',
      });
      if (!isInline && !post.eventId) navigate('/app/feed', { replace: true });
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
    <Card className={isInline ? 'p-5 border-white/5 bg-elevated/70' : 'p-6'}>
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label htmlFor={isInline ? 'feed-post-corpo' : 'post-corpo'} className="block text-xs font-bold uppercase tracking-widest text-ink-tertiary">
            Publicação
          </label>
          <textarea
            id={isInline ? 'feed-post-corpo' : 'post-corpo'}
            value={corpo}
            onChange={(event) => { setCorpo(event.target.value); }}
            rows={isInline ? 4 : 8}
            maxLength={2000}
            className="min-h-32 w-full resize-y rounded-xl border border-ink-tertiary/10 bg-recessed p-4 text-sm text-ink-primary outline-none transition-colors placeholder:text-ink-tertiary focus:border-accent focus:ring-1 focus:ring-accent"
            placeholder="Partilha uma experiência, conquista ou reflexão com a comunidade PDC..."
          />
          <div className="flex items-center justify-between gap-4 text-xs text-ink-tertiary">
            <span>{validationError}</span>
            <span>{corpo.length.toLocaleString('pt-PT')} / 2 000</span>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" isLoading={mutation.isPending} disabled={corpo.trim().length === 0}>
            <Send size={16} className="mr-2" />
            Publicar
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

import React from 'react';
import { Save, Send } from 'lucide-react';
import { Button } from '../ui/Button';

interface BuilderActionsBarProps {
  isSubmitting: boolean;
  onSaveDraft: () => void;
  state?: string;
  userRole?: string;
  onSubmitReview?: () => void;
  submitReviewLabel?: string;
  onPublish?: () => void;
  isReady?: boolean;
  pendingRequirements?: number;
  onResolveRequirements?: () => void;
}

export default function BuilderActionsBar({
  isSubmitting,
  onSaveDraft,
  state,
  onSubmitReview,
  submitReviewLabel = 'Submeter para revisão',
  onPublish,
  isReady,
  pendingRequirements = 0,
  onResolveRequirements,
}: BuilderActionsBarProps): React.ReactElement {
  const actionsAllowed = isReady !== false;
  const requirementsId = React.useId();
  return (
    <div className="bg-canvas space-y-5 rounded-lg border border-[var(--chrome-border)] p-5 shadow-[var(--elevation-1)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-ink-primary text-sm font-bold">Estado editorial</p>
          <p className="text-ink-tertiary mt-1 text-xs leading-5">
            Guarda o progresso ou envia para revisão.
          </p>
        </div>
        <span
          className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--accent-warning)]"
          aria-hidden="true"
        />
      </div>
      <div className="space-y-2">
        <Button
          type="button"
          disabled={isSubmitting}
          onClick={onSaveDraft}
          className="h-11 w-full gap-2 rounded-md font-semibold"
        >
          <Save size={14} aria-hidden="true" />
          {isSubmitting ? 'A guardar...' : 'Guardar rascunho'}
        </Button>

        {state === 'draft' && onSubmitReview && (
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting || !actionsAllowed}
            aria-describedby={!actionsAllowed ? requirementsId : undefined}
            onClick={onSubmitReview}
            className="text-accent hover:bg-accent/10 h-11 w-full gap-2 rounded-md font-semibold"
          >
            <Send size={14} aria-hidden="true" />
            {submitReviewLabel}
          </Button>
        )}

        {state === 'approved' && onPublish && (
          <Button
            type="button"
            disabled={isSubmitting || !actionsAllowed}
            aria-describedby={!actionsAllowed ? requirementsId : undefined}
            onClick={onPublish}
            className="bg-accent h-11 w-full rounded-sm font-semibold text-white"
          >
            Publicar Agora
          </Button>
        )}
      </div>
      {isReady === false ? (
        <div
          id={requirementsId}
          className="rounded-md border border-[var(--accent-warning)]/30 bg-[var(--accent-warning)]/10 p-3"
        >
          <p className="text-ink-primary text-xs font-semibold">
            {pendingRequirements > 0
              ? `${String(pendingRequirements)} ${pendingRequirements === 1 ? 'requisito pendente' : 'requisitos pendentes'}`
              : 'Curso ainda incompleto'}
          </p>
          <p className="text-ink-tertiary mt-1 text-xs leading-5">
            Podes guardar o rascunho, mas só poderás submeter ou publicar depois de completar o
            essencial.
          </p>
          {onResolveRequirements ? (
            <button
              type="button"
              onClick={onResolveRequirements}
              className="text-accent mt-2 text-xs font-bold tracking-wider uppercase hover:underline"
            >
              Resolver pendências
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

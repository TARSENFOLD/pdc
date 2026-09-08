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
  return (
    <div className="space-y-5 rounded-lg border border-[var(--chrome-border)] bg-canvas p-5 shadow-[var(--elevation-1)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-ink-primary">Estado editorial</p>
          <p className="mt-1 text-xs leading-5 text-ink-tertiary">Guarda o progresso ou envia para revisão.</p>
        </div>
        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--accent-warning)]" aria-hidden="true" />
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
            onClick={onSubmitReview}
            className="h-11 w-full gap-2 rounded-md font-semibold text-accent hover:bg-accent/10"
          >
            <Send size={14} aria-hidden="true" />
            {submitReviewLabel}
          </Button>
        )}

        {state === 'approved' && onPublish && (
          <Button 
            type="button"
            disabled={isSubmitting || !actionsAllowed}
            onClick={onPublish}
            className="h-11 w-full rounded-sm font-semibold bg-accent text-white"
          >
            Publicar Agora
          </Button>
        )}
      </div>
      {isReady === false ? (
        <div className="rounded-md border border-[var(--accent-warning)]/30 bg-[var(--accent-warning)]/10 p-3">
          <p className="text-xs font-semibold text-ink-primary">
            {pendingRequirements > 0
              ? `${String(pendingRequirements)} ${pendingRequirements === 1 ? 'requisito pendente' : 'requisitos pendentes'}`
              : 'Curso ainda incompleto'}
          </p>
          <p className="mt-1 text-xs leading-5 text-ink-tertiary">
            Podes guardar o rascunho, mas só poderás submeter ou publicar depois de completar o essencial.
          </p>
          {onResolveRequirements ? (
            <button
              type="button"
              onClick={onResolveRequirements}
              className="mt-2 text-xs font-bold uppercase tracking-wider text-accent hover:underline"
            >
              Resolver pendências
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

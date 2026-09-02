import React from 'react';
import { Save, Send } from 'lucide-react';
import { Button } from '../ui/Button';

interface BuilderActionsBarProps {
  isSubmitting: boolean;
  onSaveDraft: () => void;
  state?: string;
  userRole?: string;
  onSubmitReview?: () => void;
  onPublish?: () => void;
}

export default function BuilderActionsBar({ 
  isSubmitting, 
  onSaveDraft, 
  state,
  onSubmitReview,
  onPublish
}: BuilderActionsBarProps): React.ReactElement {
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
          disabled={isSubmitting} 
          onClick={onSaveDraft}
          className="h-11 w-full gap-2 rounded-md font-semibold"
        >
          <Save size={14} aria-hidden="true" />
          {isSubmitting ? 'A guardar...' : 'Guardar rascunho'}
        </Button>

        {state === 'draft' && onSubmitReview && (
          <Button 
            variant="outline"
            disabled={isSubmitting} 
            onClick={onSubmitReview}
            className="h-11 w-full gap-2 rounded-md font-semibold text-accent hover:bg-accent/10"
          >
            <Send size={14} aria-hidden="true" />
            Submeter para revisão
          </Button>
        )}

        {state === 'approved' && onPublish && (
          <Button 
            disabled={isSubmitting} 
            onClick={onPublish}
            className="h-11 w-full rounded-sm font-semibold bg-accent text-white"
          >
            Publicar Agora
          </Button>
        )}
      </div>
    </div>
  );
}

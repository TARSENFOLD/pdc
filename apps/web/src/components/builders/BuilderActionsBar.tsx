import React from 'react';
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
    <div className="sticky top-6 space-y-5">
      <div>
        <p className="text-sm font-semibold text-ink-primary">Publicação</p>
        <p className="mt-1 text-xs leading-5 text-ink-tertiary">Guarda o progresso ou envia o conteúdo para revisão.</p>
      </div>
      <div className="space-y-2">
        <Button 
          disabled={isSubmitting} 
          onClick={onSaveDraft}
          className="h-11 w-full rounded-sm font-semibold"
        >
          {isSubmitting ? 'Salvando...' : 'Salvar Rascunho'}
        </Button>

        {state === 'draft' && onSubmitReview && (
          <Button 
            variant="ghost"
            disabled={isSubmitting} 
            onClick={onSubmitReview}
            className="h-11 w-full rounded-sm font-semibold text-accent hover:bg-accent/10"
          >
            Submeter para Revisão
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
      
      <div className="border-t border-border pt-4">
        <p className="text-xs text-ink-tertiary">Estado atual</p>
        <p className="mt-1 text-sm font-semibold capitalize text-ink-primary">{state || 'draft'}</p>
      </div>
    </div>
  );
}

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
    <div className="sticky top-8 p-6 bg-recessed rounded-3xl border border-white/5 space-y-4">
      <div className="space-y-2">
        <Button 
          disabled={isSubmitting} 
          onClick={onSaveDraft}
          className="w-full h-14 rounded-2xl font-bold bg-white text-black hover:bg-white/90"
        >
          {isSubmitting ? 'Salvando...' : 'Salvar Rascunho'}
        </Button>

        {state === 'draft' && onSubmitReview && (
          <Button 
            variant="ghost"
            disabled={isSubmitting} 
            onClick={onSubmitReview}
            className="w-full h-12 rounded-xl font-bold text-accent hover:bg-accent/10"
          >
            Submeter para Revisão
          </Button>
        )}

        {state === 'approved' && onPublish && (
          <Button 
            disabled={isSubmitting} 
            onClick={onPublish}
            className="w-full h-14 rounded-2xl font-bold bg-accent text-white"
          >
            Publicar Agora
          </Button>
        )}
      </div>
      
      <p className="text-[10px] text-center text-ink-tertiary uppercase font-bold tracking-widest">
        Estado: {state || 'draft'}
      </p>
    </div>
  );
}

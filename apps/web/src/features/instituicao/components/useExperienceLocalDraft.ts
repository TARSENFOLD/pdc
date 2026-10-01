import { useEffect } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { CriarExperienciaPayload } from '@pdc/shared';
import { experienceDefaults } from './experience-defaults';
import { recoverExperienceDraft } from './experience-draft';

export function useExperienceLocalDraft(
  form: UseFormReturn<CriarExperienciaPayload>,
  id: string | undefined,
  initialVwx: boolean,
  storageKey: string,
  setMessage: (message: string) => void
) {
  const { reset, watch } = form;
  useEffect(() => {
    if (id) return;
    reset(experienceDefaults(initialVwx));
    const legacyKey = 'pdc_builder_experiencia_draft';
    const own = localStorage.getItem(storageKey);
    const saved = own ?? (!initialVwx ? localStorage.getItem(legacyKey) : null);
    if (saved) {
      try {
        const recovered = recoverExperienceDraft(saved, initialVwx);
        reset(recovered);
        if (!own) {
          localStorage.setItem(storageKey, JSON.stringify(recovered));
          localStorage.removeItem(legacyKey);
        }
      } catch {
        setMessage('Não foi possível recuperar o rascunho local.');
      }
    }
    const subscription = watch((value) => localStorage.setItem(storageKey, JSON.stringify(value)));
    return () => subscription.unsubscribe();
  }, [id, initialVwx, reset, storageKey, watch, setMessage]);
}

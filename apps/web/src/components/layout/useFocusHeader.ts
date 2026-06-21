import { useContext, useEffect } from 'react';
import {
  FocusHeaderStateContext,
  FocusModeDispatchContext,
  type FocusHeaderData,
} from './focus-mode-context';

/**
 * Regista o cabeçalho do modo foco. Passe `data` memoizado quando incluir
 * ReactNode em `progress` ou `actions`, para evitar updates redundantes.
 */
export function useFocusHeader(data: FocusHeaderData): void {
  const dispatch = useContext(FocusModeDispatchContext);
  const setHeader = dispatch?.setHeader;
  const clearHeader = dispatch?.clearHeader;

  useEffect(() => {
    if (!setHeader || !clearHeader) return;
    setHeader(data);
    return () => {
      clearHeader();
    };
  }, [clearHeader, data, setHeader]);
}

export function useFocusHeaderState(): FocusHeaderData {
  const header = useContext(FocusHeaderStateContext);
  if (!header) {
    throw new Error('useFocusHeaderState deve ser usado dentro de FocusModeProvider');
  }
  return header;
}

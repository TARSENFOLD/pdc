import { useContext, useEffect, useRef } from 'react';
import {
  FocusHeaderStateContext,
  FocusModeDispatchContext,
  type FocusHeaderData,
} from './focus-mode-context';

export function useFocusHeader(data: FocusHeaderData): void {
  const dispatch = useContext(FocusModeDispatchContext);
  const setHeader = dispatch?.setHeader;
  const clearHeader = dispatch?.clearHeader;
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    if (!setHeader || !clearHeader) return;
    setHeader(dataRef.current);
    return clearHeader;
  }, [clearHeader, setHeader]);
}

export function useFocusHeaderState(): FocusHeaderData {
  const header = useContext(FocusHeaderStateContext);
  if (!header) {
    throw new Error('useFocusHeaderState deve ser usado dentro de FocusModeProvider');
  }
  return header;
}

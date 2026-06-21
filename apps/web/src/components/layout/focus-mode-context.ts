import { createContext, type ReactNode } from 'react';

export interface FocusHeaderData {
  title?: string;
  backTo?: string;
  progress?: ReactNode;
  actions?: ReactNode;
}

export interface FocusModeDispatch {
  setHeader: (data: FocusHeaderData) => void;
  clearHeader: () => void;
}

export const FocusHeaderStateContext = createContext<FocusHeaderData | null>(null);
export const FocusModeDispatchContext = createContext<FocusModeDispatch | null>(null);

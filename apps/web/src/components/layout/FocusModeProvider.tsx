import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  FocusHeaderStateContext,
  FocusModeDispatchContext,
  type FocusHeaderData,
} from './focus-mode-context';

export default function FocusModeProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [header, setHeaderState] = useState<FocusHeaderData>({});
  const setHeader = useCallback((data: FocusHeaderData) => {
    setHeaderState(data);
  }, []);
  const clearHeader = useCallback(() => {
    setHeaderState({});
  }, []);
  const dispatch = useMemo(() => ({ setHeader, clearHeader }), [clearHeader, setHeader]);

  return (
    <FocusModeDispatchContext.Provider value={dispatch}>
      <FocusHeaderStateContext.Provider value={header}>
        {children}
      </FocusHeaderStateContext.Provider>
    </FocusModeDispatchContext.Provider>
  );
}

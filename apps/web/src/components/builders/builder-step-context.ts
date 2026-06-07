import { createContext, useContext } from 'react';

interface BuilderStepContextValue {
  activeSection: string | null;
}

export const BuilderStepContext = createContext<BuilderStepContextValue>({
  activeSection: null,
});

export function useBuilderStep(): BuilderStepContextValue {
  return useContext(BuilderStepContext);
}

import { createContext, useContext } from 'react';
import type { BootstrapResponse } from '@pdc/shared';

export interface BootstrapContextValue {
  data: BootstrapResponse | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export const BootstrapContext = createContext<BootstrapContextValue | null>(null);

export function useBootstrap(): BootstrapContextValue {
  const ctx = useContext(BootstrapContext);
  return ctx ?? { data: null, isLoading: true, error: null, refresh: async () => {} };
}

import { createContext, useContext, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from '@/lib/api/http';
import type { BootstrapResponse } from '@pdc/shared';
import BootstrapErrorScreen from '@/components/layout/BootstrapErrorScreen';

interface BootstrapContextValue {
  data: BootstrapResponse | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export const BootstrapContext = createContext<BootstrapContextValue | null>(null);

async function fetchBootstrap(): Promise<BootstrapResponse> {
  return await http.get<BootstrapResponse>('/bootstrap');
}

function exponentialBackoff(failureCount: number): number {
  // Exponential backoff: 1s, 2s, 4s
  return Math.min(1000 * Math.pow(2, failureCount - 1), 4000);
}

export function BootstrapProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data = null, isLoading, error, isError } = useQuery({
    queryKey: ['bootstrap'],
    queryFn: fetchBootstrap,
    staleTime: 15 * 60 * 1000, // Cache de 15 minutos (Session and capabilities)
    gcTime: 30 * 60 * 1000,
    retry: 3,
    retryDelay: exponentialBackoff,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['bootstrap'] });
  };

  if (isLoading) {
    // Loading minimalista e rápido do Sistema Operativo
    return (
      <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--surface-canvas)' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--accent-terracotta)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (isError) {
    // Estado de erro premium - W0.2
    console.error('Falha crítica ao obter camada de Bootstrap', error);

    return <BootstrapErrorScreen onRetry={() => { void refresh(); }} />;
  }

  return (
    <BootstrapContext.Provider value={{ data, isLoading, error, refresh }}>
      {children}
    </BootstrapContext.Provider>
  );
}

export function useBootstrap(): BootstrapContextValue {
  const ctx = useContext(BootstrapContext);
  // Em vez de crashar, devolvemos um estado de "Loading" seguro para evitar erros de renderização
  return ctx ?? { data: null, isLoading: true, error: null, refresh: async () => {} };
}

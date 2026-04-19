import { createContext, useContext, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { http } from '@/lib/api/http';
import type { BootstrapResponse } from '@pdc/shared';

interface BootstrapContextValue {
  data: BootstrapResponse | null;
  isLoading: boolean;
  error: Error | null;
}

const BootstrapContext = createContext<BootstrapContextValue | null>(null);

async function fetchBootstrap(): Promise<BootstrapResponse> {
  return await http.get<BootstrapResponse>('/bootstrap');
}

export function BootstrapProvider({ children }: { children: ReactNode }) {
  const { data = null, isLoading, error } = useQuery({
    queryKey: ['bootstrap'],
    queryFn: fetchBootstrap,
    staleTime: 15 * 60 * 1000, // Cache de 15 minutos (Session and capabilities)
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });

  if (isLoading) {
    // Loading minimalista e rápido do Sistema Operativo
    return (
      <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F9FA' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #D2691E', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (error) {
    // Fail-safe gracioso - W1-T3
    console.error('Falha crítica ao obter camada de Bootstrap', error);
  }

  return (
    <BootstrapContext.Provider value={{ data, isLoading, error }}>
      {children}
    </BootstrapContext.Provider>
  );
}

export function useBootstrap(): BootstrapContextValue {
  const ctx = useContext(BootstrapContext);
  // Em vez de crashar, devolvemos um estado de "Loading" seguro para evitar erros de renderização
  return ctx ?? { data: null, isLoading: true, error: null };
}

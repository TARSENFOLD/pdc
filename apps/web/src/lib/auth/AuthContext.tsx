import { createContext, useContext, type ReactNode, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { authApi, type LoginPayload, type LoginResponse, type RegisterPayload } from '@/lib/api/auth';
import type { User } from '@pdc/shared';
import { telemetriaService } from '../telemetria/telemetria.service';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<LoginResponse>;
  completeOtp: (otp: string, canal: 'email' | 'sms') => Promise<void>;
  register: (payload: RegisterPayload) => Promise<LoginResponse>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data: user = null, isLoading, isFetched } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authApi.me().catch((err) => {
      console.warn('[AUTH] Falha ao recuperar sessão:', err);
      return null;
    }),
    retry: (failureCount, error: any) => {
      // Não repetir se for 401 ou 403 (Sessão inválida/expirada)
      if (error?.status === 401 || error?.status === 403) return false;
      return failureCount < 1;
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (isFetched && user) {
      void telemetriaService.syncPending();
    }
  }, [isFetched, user]);

  const loginMutation = useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: (result) => {
      if ('id' in result) {
        queryClient.setQueryData(['auth', 'me'], result);
      }
    },
  });

  const completeOtpMutation = useMutation({
    mutationFn: ({ otp, canal }: { otp: string; canal: 'email' | 'sms' }) =>
      authApi.verifyOtp(otp, canal),
    onSuccess: (verifiedUser) => {
      // Invalida e força refetch para garantir integridade total
      void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      queryClient.setQueryData(['auth', 'me'], verifiedUser);
    },
  });

  const registerMutation = useMutation({
    mutationFn: (payload: RegisterPayload) => authApi.register(payload),
    onSuccess: (result) => {
      if ('id' in result) {
        queryClient.setQueryData(['auth', 'me'], result);
      }
    },
  });

  async function login(payload: LoginPayload): Promise<LoginResponse> {
    return loginMutation.mutateAsync(payload);
  }

  async function completeOtp(otp: string, canal: 'email' | 'sms'): Promise<void> {
    await completeOtpMutation.mutateAsync({ otp, canal });
  }

  async function register(payload: RegisterPayload): Promise<LoginResponse> {
    return registerMutation.mutateAsync(payload);
  }

  async function logout() {
    await authApi.logout();
    queryClient.setQueryData(['auth', 'me'], null);
    await queryClient.resetQueries({ queryKey: ['auth'] });
    queryClient.clear();
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: isLoading && !isFetched,
        isAuthenticated: !!user,
        login,
        completeOtp,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

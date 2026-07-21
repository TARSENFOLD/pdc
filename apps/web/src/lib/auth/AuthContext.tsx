import { type ReactNode, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { authApi, type LoginPayload, type LoginResponse, type RegisterPayload } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/http';
import { telemetriaService } from '../telemetria/telemetria.service';
import { AuthContext } from './auth-context';

function getErrorStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  if ('status' in error && typeof error.status === 'number') return error.status;
  if ('response' in error) {
    const response = error.response;
    if (typeof response === 'object' && response !== null && 'status' in response && typeof response.status === 'number') {
      return response.status;
    }
  }
  return undefined;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data: user = null, isLoading, isFetched, error } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authApi.restoreSession(),
    retry: (failureCount, error: unknown) => {
      // Não repetir se for 401 ou 403 (Sessão inválida/expirada)
      const status = getErrorStatus(error);
      if (status === 401 || status === 403) return false;
      return failureCount < 1;
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (error) {
      console.warn('[AUTH] Falha ao recuperar sessão', {
        status: getErrorStatus(error) ?? 'unknown',
      });
    }
  }, [error]);

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
    mutationFn: ({ otp, canal, trustDevice }: {
      otp: string;
      canal: 'email' | 'sms';
      trustDevice: boolean;
    }) => authApi.verifyOtp(otp, canal, trustDevice),
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

  async function completeOtp(
    otp: string,
    canal: 'email' | 'sms',
    trustDevice: boolean,
  ): Promise<void> {
    await completeOtpMutation.mutateAsync({ otp, canal, trustDevice });
  }

  async function register(payload: RegisterPayload): Promise<LoginResponse> {
    return registerMutation.mutateAsync(payload);
  }

  async function logout() {
    try {
      await authApi.logout();
    } catch (err) {
      if (!(err instanceof ApiError) || err.status !== 401) {
        throw err;
      }
    } finally {
      queryClient.setQueryData(['auth', 'me'], null);
      await queryClient.resetQueries({ queryKey: ['auth'] });
      queryClient.clear();
    }
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

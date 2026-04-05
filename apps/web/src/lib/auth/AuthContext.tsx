import { createContext, useContext, type ReactNode } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { authApi, type LoginPayload, type LoginResponse, type RegisterPayload } from '@/lib/api/auth';
import type { User } from '@pdc/shared';

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

  const { data: user = null, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authApi.me().catch(() => null),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const loginMutation = useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
  });

  const completeOtpMutation = useMutation({
    mutationFn: ({ otp, canal }: { otp: string; canal: 'email' | 'sms' }) =>
      authApi.verifyOtp(otp, canal),
    onSuccess: (verifiedUser) => {
      queryClient.setQueryData(['auth', 'me'], verifiedUser);
    },
  });

  const registerMutation = useMutation({
    mutationFn: (payload: RegisterPayload) => authApi.register(payload),
  });

  async function login(payload: LoginPayload): Promise<LoginResponse> {
    return loginMutation.mutateAsync(payload);
  }

  async function completeOtp(otp: string, canal: 'email' | 'sms'): Promise<void> {
    await completeOtpMutation.mutateAsync({ otp, canal });
  }

  async function register(payload: RegisterPayload): Promise<LoginResponse> {
    // Both login and register now return LoginResponse (requiresOtp: true)
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
        isLoading,
        isAuthenticated: user !== null,
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

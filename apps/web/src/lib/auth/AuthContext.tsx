import { createContext, useContext, type ReactNode } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { authApi, type LoginPayload, type RegisterPayload } from '@/lib/api/auth';
import type { User } from '@pdc/shared';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
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
    onSuccess: (newUser) => {
      queryClient.setQueryData(['auth', 'me'], newUser);
    },
  });

  const registerMutation = useMutation({
    mutationFn: (payload: RegisterPayload) => authApi.register(payload),
    onSuccess: (newUser) => {
      queryClient.setQueryData(['auth', 'me'], newUser);
    },
  });

  async function login(payload: LoginPayload) {
    await loginMutation.mutateAsync(payload);
  }

  async function register(payload: RegisterPayload) {
    await registerMutation.mutateAsync(payload);
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

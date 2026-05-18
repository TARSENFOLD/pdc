import { createContext, useContext } from 'react';
import type { User } from '@pdc/shared';
import type { LoginPayload, LoginResponse, RegisterPayload } from '@/lib/api/auth';

export interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<LoginResponse>;
  completeOtp: (otp: string, canal: 'email' | 'sms') => Promise<void>;
  register: (payload: RegisterPayload) => Promise<LoginResponse>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

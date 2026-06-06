import { http } from './http';
import type {
  User,
  OAuthFinalizarRoleChoice,
  RegistoEstudantePayload,
  RegistoMentorPayload,
  RegistoInstituicaoPayload,
} from '@pdc/shared';

export interface LoginPayload {
  email: string;
  password: string;
}

export type LoginResponse = 
  | { requiresOtp: true; canal: 'email' | 'sms' }
  | User;

export interface RegisterPayload {
  email: string;
  password: string;
  nome: string;
}

export const authApi = {
  me: () => http.get<User | null>('/auth/me'),
  login: (payload: LoginPayload) => http.post<LoginResponse>('/auth/login', payload),
  register: (payload: RegisterPayload) => http.post<LoginResponse>('/auth/register', payload),
  logout: () => http.post<undefined>('/auth/logout', {}),
  forgotPassword: (email: string) =>
    http.post<{ success: boolean; message: string }>('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    http.post<{ success: boolean }>('/auth/reset-password', { token, password }),
  registarEstudante: (payload: RegistoEstudantePayload) => http.post<LoginResponse>('/auth/register/estudante', payload),
  registarMentor: (payload: RegistoMentorPayload) => http.post<LoginResponse>('/auth/register/mentor', payload),
  registarInstituicao: (payload: RegistoInstituicaoPayload) => http.post<LoginResponse>('/auth/register/instituicao', payload),
  sendOtp: (canal: 'email' | 'sms', phone?: string) =>
    http.post<{ success: boolean; canal: string }>('/auth/otp/send', { canal, phone }),
  verifyOtp: (otp: string, canal: 'email' | 'sms') =>
    http.post<User>('/auth/otp/verify', { otp, canal }),
  loginWithGoogle: () => {
    const baseUrl: string = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';
    window.location.href = `${baseUrl}/auth/google`;
  },
  loginWithLinkedIn: () => {
    const baseUrl: string = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';
    window.location.href = `${baseUrl}/auth/linkedin`;
  },
  finalizarOAuthRole: (payload: OAuthFinalizarRoleChoice) =>
    http.post<User>('/auth/finalizar/escolher-role', payload),
  verificarOAuthOtp: (otp: string) =>
    http.post<User>('/auth/finalizar/verificar-otp', { otp }),
};

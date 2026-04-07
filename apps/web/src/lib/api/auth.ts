import { http } from './http';
import type { User, RegistoEstudantePayload, RegistoMentorPayload, RegistoInstituicaoPayload } from '@pdc/shared';

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
  me: () => http.get<User>('/auth/me'),
  login: (payload: LoginPayload) => http.post<LoginResponse>('/auth/login', payload),
  register: (payload: RegisterPayload) => http.post<LoginResponse>('/auth/register', payload),
  logout: () => http.post<undefined>('/auth/logout', {}),
  registarEstudante: (payload: RegistoEstudantePayload) => http.post<LoginResponse>('/auth/register/estudante', payload),
  registarMentor: (payload: RegistoMentorPayload) => http.post<LoginResponse>('/auth/register/mentor', payload),
  registarInstituicao: (payload: RegistoInstituicaoPayload) => http.post<LoginResponse>('/auth/register/instituicao', payload),
  sendOtp: (canal: 'email' | 'sms', phone?: string) =>
    http.post<{ success: boolean; canal: string }>('/auth/otp/send', { canal, phone }),
  verifyOtp: (otp: string, canal: 'email' | 'sms') =>
    http.post<User>('/auth/otp/verify', { otp, canal }),
  loginWithGoogle: () => {
    const baseUrl: string = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001';
    window.location.href = `${baseUrl}/auth/google`;
  },
};

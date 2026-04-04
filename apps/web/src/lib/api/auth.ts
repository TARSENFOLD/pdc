import { http } from './http';
import type { User, RegistoEstudantePayload, RegistoMentorPayload, RegistoInstituicaoPayload } from '@pdc/shared';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  nome: string;
}

export const authApi = {
  me: () => http.get<User>('/auth/me'),
  login: (payload: LoginPayload) => http.post<User>('/auth/login', payload),
  register: (payload: RegisterPayload) => http.post<User>('/auth/register', payload),
  logout: () => http.post<undefined>('/auth/logout', {}),
  registarEstudante: (payload: RegistoEstudantePayload) => http.post<User>('/auth/register/estudante', payload),
  registarMentor: (payload: RegistoMentorPayload) => http.post<User>('/auth/register/mentor', payload),
  registarInstituicao: (payload: RegistoInstituicaoPayload) => http.post<User>('/auth/register/instituicao', payload),
};

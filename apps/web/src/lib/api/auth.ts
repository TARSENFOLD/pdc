import { http } from './http';
import type { User } from '@pdc/shared';

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
  logout: () => http.post<void>('/auth/logout', {}),
};

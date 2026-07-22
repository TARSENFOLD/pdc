import { http } from './http';
import type {
  User,
  LegalComplianceCompletion,
  OAuthFinalizarRoleChoice,
  RegistoEstudantePayload,
  RegistoMentorPayload,
  RegistoInstituicaoPayload,
} from '@pdc/shared';
import { UserSchema } from '@pdc/shared';
import { z } from 'zod';
import { ApiError, refreshSession } from './http';
import { resolveApiBaseUrl } from './base-url';
import { SESSION_SERVICE_UNAVAILABLE_MESSAGE } from './auth-errors';

const AUTH_BASE_URL = resolveApiBaseUrl(
  import.meta.env.VITE_API_URL,
  import.meta.env.PROD === true,
);

export interface LoginPayload {
  email: string;
  password: string;
}

export type LoginResponse = 
  | { requiresOtp: true; canal: 'email' | 'sms' }
  | User;

const LoginResponseSchema = z.union([
  z.object({ requiresOtp: z.literal(true), canal: z.enum(['email', 'sms']) }),
  UserSchema,
]);
const SuccessResponseSchema = z.object({ success: z.boolean() });
const SendOtpResponseSchema = z.object({
  success: z.boolean(),
  canal: z.enum(['email', 'sms']),
});
const ForgotPasswordResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export interface RegisterPayload {
  email: string;
  password: string;
  nome: string;
}

export const authApi = {
  me: () => http.getParsed('/auth/me', UserSchema.nullable()),
  restoreSession: async (): Promise<User | null> => {
    let currentUser: User | null;
    try {
      currentUser = await http.getParsed('/auth/me', UserSchema.nullable());
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
      currentUser = null;
    }
    if (currentUser) return currentUser;
    const refreshResult = await refreshSession({ notifyOnInvalid: false });
    if (refreshResult === 'invalid') return null;
    if (refreshResult === 'unavailable') {
      throw new ApiError(503, SESSION_SERVICE_UNAVAILABLE_MESSAGE);
    }
    return http.getParsed('/auth/me', UserSchema.nullable());
  },
  login: (payload: LoginPayload) => http.postParsed('/auth/login', payload, LoginResponseSchema),
  register: (payload: RegisterPayload) => http.postParsed(
    '/auth/register',
    payload,
    LoginResponseSchema,
  ),
  logout: () => http.postParsed('/auth/logout', {}, SuccessResponseSchema),
  forgotPassword: (email: string) =>
    http.postParsed('/auth/forgot-password', { email }, ForgotPasswordResponseSchema),
  resetPassword: (token: string, password: string) =>
    http.postParsed('/auth/reset-password', { token, password }, SuccessResponseSchema),
  registarEstudante: (payload: RegistoEstudantePayload) => http.postParsed(
    '/auth/register/estudante',
    payload,
    LoginResponseSchema,
  ),
  registarMentor: (payload: RegistoMentorPayload) => http.postParsed(
    '/auth/register/mentor',
    payload,
    LoginResponseSchema,
  ),
  registarInstituicao: (payload: RegistoInstituicaoPayload) => http.postParsed(
    '/auth/register/instituicao',
    payload,
    LoginResponseSchema,
  ),
  sendOtp: (canal: 'email' | 'sms', phone?: string) =>
    http.postParsed('/auth/otp/send', { canal, phone }, SendOtpResponseSchema),
  verifyOtp: (otp: string, canal: 'email' | 'sms', trustDevice: boolean) =>
    http.postParsed('/auth/otp/verify', { otp, canal, trustDevice }, UserSchema),
  forgetTrustedDevice: () => http.deleteParsed(
    '/auth/trusted-device',
    undefined,
    SuccessResponseSchema,
  ),
  loginWithGoogle: () => {
    window.location.assign(`${AUTH_BASE_URL}/auth/google`);
  },
  loginWithLinkedIn: () => {
    window.location.assign(`${AUTH_BASE_URL}/auth/linkedin`);
  },
  finalizarOAuthRole: (payload: OAuthFinalizarRoleChoice) =>
    http.postParsed('/auth/finalizar/escolher-role', payload, UserSchema),
  verificarOAuthOtp: (otp: string) =>
    http.postParsed('/auth/finalizar/verificar-otp', { otp }, UserSchema),
  completarComplianceLegal: (payload: LegalComplianceCompletion) =>
    http.postParsed('/auth/compliance/legal', payload, UserSchema),
};

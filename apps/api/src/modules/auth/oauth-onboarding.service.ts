import pino from 'pino';
import { otpService } from './otp.service.js';
import { strapiGet, strapiPut } from '../strapi/strapi.client.js';
import { authService } from './auth.service.js';
import { env } from '../../lib/env.js';
import { type OAuthFinalizarRoleChoice } from '@pdc/shared';

const log = pino({ name: 'oauth-onboarding-service' });

interface StrapiPerfilItem {
  id: string;
  userId?: string;
  tipo?: string;
  aprovado?: boolean;
}

function restorePerfilPayload(perfil: StrapiPerfilItem): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries({
      tipo: perfil.tipo,
      aprovado: perfil.aprovado,
    }).filter(([, value]) => value !== undefined),
  );
}

export const oauthOnboardingService = {
  async escolherRole(
    userId: string,
    payload: OAuthFinalizarRoleChoice,
  ): Promise<void> {
    const res = await strapiGet<StrapiPerfilItem>('/perfis', {
      'filters[userId][$eq]': userId,
    });
    const perfil = res.data[0];
    if (!perfil) {
      throw Object.assign(new Error('Perfil não encontrado'), { status: 404 });
    }

    // Server-authoritative fields — never overwritten by client payload
    const aprovado = payload.role === 'estudante';
    const strapiPayload: Record<string, unknown> = {
      tipo: payload.role,
      aprovado,
    };

    if (payload.role === 'mentor') {
      strapiPayload.areaEspecialidade = payload.areaEspecialidade;
      if (payload.documentos.length > 0) {
        strapiPayload.documentos = payload.documentos;
      }
    } else if (payload.role === 'instituicao') {
      strapiPayload.nomeInstituicao = payload.nomeInstituicao;
      strapiPayload.tipoInstituicao = payload.tipoInstituicao;
      if (payload.documentos.length > 0) {
        strapiPayload.documentos = payload.documentos;
      }
    }

    await strapiPut<StrapiPerfilItem>(`/perfis/${perfil.id}`, strapiPayload);

    const otp = otpService.generateOtp();
    await otpService.storeOtp(userId, otp, 'email');

    if (env.NODE_ENV === 'development') {
      log.info({ userId, otpPresent: true }, '[DEV] OAuth onboarding OTP gerado');
    }

    try {
      const user = await authService.getUserById(userId);
      await otpService.sendOtpEmail(user.email, otp);
    } catch (err) {
      await Promise.allSettled([
        strapiPut<StrapiPerfilItem>(`/perfis/${perfil.id}`, restorePerfilPayload(perfil)),
        otpService.deleteOtp(userId, 'email'),
      ]);
      log.error({ err, userId, perfilId: perfil.id }, 'Falha ao enviar OTP de onboarding OAuth');
      throw Object.assign(new Error('Falha ao enviar código de verificação'), { status: 500 });
    }
  },

  async verificarOtp(userId: string, otp: string): Promise<void> {
    const isValid = await otpService.verifyOtp(userId, otp, 'email');
    if (!isValid) {
      throw Object.assign(new Error('Código inválido ou expirado'), { status: 400 });
    }

    const res = await strapiGet<StrapiPerfilItem>('/perfis', {
      'filters[userId][$eq]': userId,
    });
    const perfil = res.data[0];
    if (!perfil) {
      throw Object.assign(new Error('Perfil não encontrado'), { status: 404 });
    }

    await strapiPut<StrapiPerfilItem>(`/perfis/${perfil.id}`, {
      oauthVerified: true,
      onboardingCompleto: true,
    });
  },
};

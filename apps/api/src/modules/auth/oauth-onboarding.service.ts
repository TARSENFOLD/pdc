import pino from 'pino';
import { otpService } from './otp.service.js';
import { strapiGet, strapiPut } from '../strapi/strapi.client.js';
import { type OAuthFinalizarRoleChoice } from '@pdc/shared';
import { provisionInstituicaoForUser } from '../instituicoes/instituicao.provision.js';

const log = pino({ name: 'oauth-onboarding-service' });

interface StrapiPerfilItem {
  id: string | number;
  documentId?: string;
  userId?: string;
  tipo?: string;
  aprovado?: boolean;
}

function perfilPersistedId(perfil: StrapiPerfilItem): string {
  return perfil.documentId ?? String(perfil.id);
}

export const oauthOnboardingService = {
  async escolherRole(
    userId: string,
    payload: OAuthFinalizarRoleChoice,
  ): Promise<void> {
    const res = await strapiGet<StrapiPerfilItem>('/perfis', {
      'filters[userId][$eq]': userId,
      'fields[0]': 'id',
      'fields[1]': 'documentId',
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
      oauthVerified: true,
      onboardingCompleto: true,
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
      await provisionInstituicaoForUser(userId, {
        nome: payload.nomeInstituicao,
        tipo: payload.tipoInstituicao,
        documentos: payload.documentos,
      });
    }

    const perfilId = perfilPersistedId(perfil);
    await strapiPut<StrapiPerfilItem>(`/perfis/${perfilId}`, strapiPayload);
    log.info({ userId, perfilId, role: payload.role }, 'OAuth onboarding concluído sem OTP');
  },

  async verificarOtp(userId: string, otp: string): Promise<void> {
    const isValid = await otpService.verifyOtp(userId, otp, 'email');
    if (!isValid) {
      throw Object.assign(new Error('Código inválido ou expirado'), { status: 400 });
    }

    const res = await strapiGet<StrapiPerfilItem>('/perfis', {
      'filters[userId][$eq]': userId,
      'fields[0]': 'id',
      'fields[1]': 'documentId',
    });
    const perfil = res.data[0];
    if (!perfil) {
      throw Object.assign(new Error('Perfil não encontrado'), { status: 404 });
    }

    await strapiPut<StrapiPerfilItem>(`/perfis/${perfilPersistedId(perfil)}`, {
      oauthVerified: true,
      onboardingCompleto: true,
    });
  },
};

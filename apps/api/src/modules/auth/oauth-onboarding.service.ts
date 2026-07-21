import pino from 'pino';
import { otpService } from './otp.service.js';
import { strapiGet, strapiPut } from '../strapi/strapi.client.js';
import { resolveEstadoMenoridade, type OAuthFinalizarRoleChoice } from '@pdc/shared';
import { provisionInstituicaoForUser } from '../instituicoes/instituicao.provision.js';
import { buildPerfilComplianceFields } from './auth.compliance.js';
import { consentService } from '../consent/consent.service.js';
import { AuthDomainError } from './auth.errors.js';

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

function assertAdultRoleEligibility(payload: OAuthFinalizarRoleChoice): void {
  if (payload.role === 'estudante') return;
  if (resolveEstadoMenoridade(payload.dataNascimento) === 'menor') {
    throw new AuthDomainError('Mentores e instituições devem ser representados por utilizadores adultos.', 400);
  }
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
      throw new AuthDomainError('Perfil não encontrado', 404);
    }

    assertAdultRoleEligibility(payload);
    const perfilId = perfilPersistedId(perfil);
    await consentService.recordLegalAcceptance({
      userId,
      perfilId: perfil.id,
      actorRole: payload.role,
      aceiteLegal: payload.aceiteLegal,
      source: 'oauth',
      dataNascimento: payload.dataNascimento,
      ...(perfil.documentId ? { perfilDocumentId: perfil.documentId } : {}),
      ...(payload.consentimentoEncarregado ? { consentimentoEncarregado: payload.consentimentoEncarregado } : {}),
    });

    // Server-authoritative fields — never overwritten by client payload
    const aprovado = payload.role === 'estudante';
    const strapiPayload: Record<string, unknown> = {
      ...buildPerfilComplianceFields({
        source: 'oauth',
        dataNascimento: payload.dataNascimento,
        aceiteLegal: payload.aceiteLegal,
        ...(payload.consentimentoEncarregado ? { consentimentoEncarregado: payload.consentimentoEncarregado } : {}),
      }),
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
      await provisionInstituicaoForUser(userId, {
        nome: payload.nomeInstituicao,
        nomeLegal: payload.nomeInstituicao,
        tipo: payload.tipoInstituicao,
      });
    }

    await strapiPut<StrapiPerfilItem>(`/perfis/${perfilId}`, strapiPayload);
    log.info({ userId, perfilId, role: payload.role }, 'OAuth onboarding concluído sem OTP');
  },

  async verificarOtp(userId: string, otp: string): Promise<void> {
    const isValid = await otpService.verifyOtp(userId, otp, 'email');
    if (!isValid) {
      throw new AuthDomainError('Código inválido ou expirado', 400);
    }

    const res = await strapiGet<StrapiPerfilItem>('/perfis', {
      'filters[userId][$eq]': userId,
      'fields[0]': 'id',
      'fields[1]': 'documentId',
    });
    const perfil = res.data[0];
    if (!perfil) {
      throw new AuthDomainError('Perfil não encontrado', 404);
    }

    await strapiPut<StrapiPerfilItem>(`/perfis/${perfilPersistedId(perfil)}`, {
      oauthVerified: true,
      onboardingCompleto: true,
    });
  },
};

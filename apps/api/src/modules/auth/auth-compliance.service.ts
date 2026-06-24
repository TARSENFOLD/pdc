import {
  resolveEstadoMenoridade,
  type LegalComplianceCompletion,
  type Role,
} from '@pdc/shared';
import { strapiGet, strapiPut } from '../strapi/strapi.client.js';
import { consentService } from '../consent/consent.service.js';
import { buildPerfilComplianceFields } from './auth.compliance.js';

interface PerfilComplianceItem {
  id: string | number;
  documentId?: string;
}

function perfilPersistedId(perfil: PerfilComplianceItem): string {
  return perfil.documentId ?? String(perfil.id);
}

function semanticError(message: string, status: 400 | 404): Error & { status: 400 | 404 } {
  return Object.assign(new Error(message), { status });
}

function assertRoleAgeEligibility(role: Role, dataNascimento: string): void {
  if (role === 'estudante') return;
  if (resolveEstadoMenoridade(dataNascimento) === 'menor') {
    throw semanticError('Este papel deve ser representado por um utilizador adulto.', 400);
  }
}

export const authComplianceService = {
  async completeLegalCompliance(
    userId: string,
    role: Role,
    payload: LegalComplianceCompletion,
  ): Promise<void> {
    assertRoleAgeEligibility(role, payload.dataNascimento);
    const res = await strapiGet<PerfilComplianceItem>('/perfis', {
      'filters[userId][$eq]': userId,
      'fields[0]': 'id',
      'fields[1]': 'documentId',
      'pagination[pageSize]': '1',
    });
    const perfil = res.data[0];
    if (!perfil) throw semanticError('Perfil não encontrado', 404);

    await consentService.recordLegalAcceptance({
      userId,
      perfilId: perfil.id,
      actorRole: role,
      aceiteLegal: payload.aceiteLegal,
      source: 'reconsentimento',
      dataNascimento: payload.dataNascimento,
      ...(perfil.documentId ? { perfilDocumentId: perfil.documentId } : {}),
      ...(payload.consentimentoEncarregado ? { consentimentoEncarregado: payload.consentimentoEncarregado } : {}),
    });

    await strapiPut(`/perfis/${perfilPersistedId(perfil)}`, {
      ...buildPerfilComplianceFields({
        source: 'reconsentimento',
        dataNascimento: payload.dataNascimento,
        aceiteLegal: payload.aceiteLegal,
        ...(payload.consentimentoEncarregado ? { consentimentoEncarregado: payload.consentimentoEncarregado } : {}),
      }),
    });
  },
};

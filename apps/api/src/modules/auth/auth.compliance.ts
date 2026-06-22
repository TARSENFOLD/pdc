import {
  type AceiteLegal,
  type ConsentimentoEncarregado,
  resolveEstadoMenoridade,
} from '@pdc/shared';

export interface RegistrationComplianceInput {
  aceiteLegal?: AceiteLegal;
  dataNascimento?: string;
  consentimentoEncarregado?: ConsentimentoEncarregado;
  source: 'registo_email' | 'oauth' | 'admin' | 'importacao_institucional' | 'reconsentimento';
}

export function buildPerfilComplianceFields(input?: RegistrationComplianceInput): Record<string, unknown> {
  if (!input) {
    return {
      consentimentoEstado: 'pendente',
      estadoMenoridade: 'pendente',
      consents: {},
    };
  }

  const estadoMenoridade = resolveEstadoMenoridade(input.dataNascimento);
  return {
    ...(input.dataNascimento !== undefined ? { dataNascimento: input.dataNascimento } : {}),
    estadoMenoridade,
    consentimentoEstado: input.aceiteLegal ? 'completo' : 'pendente',
    consents: {},
    ...(input.aceiteLegal ? {
      legalTermsVersion: input.aceiteLegal.termosUsoVersao,
      legalPrivacyVersion: input.aceiteLegal.politicaPrivacidadeVersao,
      legalDataProcessingVersion: input.aceiteLegal.tratamentoDadosVersao,
      legalAcceptedAt: input.aceiteLegal.aceiteEm ?? new Date().toISOString(),
    } : {}),
    ...(input.consentimentoEncarregado ? {
      guardianConsent: {
        nome: input.consentimentoEncarregado.nome,
        email: input.consentimentoEncarregado.email,
        parentesco: input.consentimentoEncarregado.parentesco,
        acceptedAt: new Date().toISOString(),
      },
    } : {}),
  };
}

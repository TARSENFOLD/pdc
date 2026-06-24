export const E2E_DATA_NASCIMENTO_ADULTO = '1990-01-01';
export const E2E_LEGAL_ACCEPTED_AT = '2026-06-22T00:00:00.000Z';

export const E2E_ACEITE_LEGAL = {
  termosUso: true,
  politicaPrivacidade: true,
  tratamentoDados: true,
  termosUsoVersao: 'termos-uso@2026-06-22',
  politicaPrivacidadeVersao: 'politica-privacidade@2026-06-22',
  tratamentoDadosVersao: 'tratamento-dados@2026-06-22',
  aceiteEm: E2E_LEGAL_ACCEPTED_AT,
} as const;

export const E2E_PERFIL_COMPLIANCE = {
  dataNascimento: E2E_DATA_NASCIMENTO_ADULTO,
  estadoMenoridade: 'adulto',
  consentimentoEstado: 'completo',
  contaEstado: 'ativa',
  legalTermsVersion: E2E_ACEITE_LEGAL.termosUsoVersao,
  legalPrivacyVersion: E2E_ACEITE_LEGAL.politicaPrivacidadeVersao,
  legalDataProcessingVersion: E2E_ACEITE_LEGAL.tratamentoDadosVersao,
  legalAcceptedAt: E2E_LEGAL_ACCEPTED_AT,
  consents: {
    termos: {
      tipo: 'termos',
      versao: E2E_ACEITE_LEGAL.termosUsoVersao,
      concedido: true,
      at: E2E_LEGAL_ACCEPTED_AT,
    },
    privacidade: {
      tipo: 'privacidade',
      versao: E2E_ACEITE_LEGAL.politicaPrivacidadeVersao,
      concedido: true,
      at: E2E_LEGAL_ACCEPTED_AT,
    },
  },
} as const;

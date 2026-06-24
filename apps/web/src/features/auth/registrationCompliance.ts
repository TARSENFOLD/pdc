import {
  LEGAL_DOCUMENT_CURRENT_VERSIONS,
  type AceiteLegal,
  type ConsentimentoEncarregado,
} from '@pdc/shared';

export function buildAceiteLegal(): AceiteLegal {
  return {
    termosUso: true,
    politicaPrivacidade: true,
    tratamentoDados: true,
    termosUsoVersao: LEGAL_DOCUMENT_CURRENT_VERSIONS.termosUso,
    politicaPrivacidadeVersao: LEGAL_DOCUMENT_CURRENT_VERSIONS.politicaPrivacidade,
    tratamentoDadosVersao: LEGAL_DOCUMENT_CURRENT_VERSIONS.tratamentoDados,
    aceiteEm: new Date().toISOString(),
  };
}

export function emptyConsentimentoEncarregado(): ConsentimentoEncarregado {
  return {
    nome: '',
    email: '',
    parentesco: 'tutor_legal',
    aceite: true,
  };
}

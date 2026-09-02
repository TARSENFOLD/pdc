import { describe, expect, it } from 'vitest';
import { ApiError } from './http';
import {
  institutionKeys,
  isInstituicaoAssociacaoAusente,
} from './instituicoes';

describe('instituicoesApi contracts', () => {
  it('mantém uma única query key para o perfil institucional', () => {
    expect(institutionKeys.me()).toEqual(['instituicao', 'me']);
  });

  it('reconhece apenas o erro semântico de associação ausente', () => {
    expect(isInstituicaoAssociacaoAusente(new ApiError(409, 'HTTP 409', {
      code: 'INSTITUICAO_ASSOCIACAO_AUSENTE',
    }))).toBe(true);
    expect(isInstituicaoAssociacaoAusente(new ApiError(409, 'HTTP 409', {
      code: 'OUTRO_CONFLITO',
    }))).toBe(false);
    expect(isInstituicaoAssociacaoAusente(new ApiError(409, 'HTTP 409'))).toBe(false);
    expect(isInstituicaoAssociacaoAusente(new ApiError(409, 'HTTP 409', null))).toBe(false);
    expect(isInstituicaoAssociacaoAusente(new ApiError(503, 'HTTP 503'))).toBe(false);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const strapiGetMock = vi.hoisted(() => vi.fn());
const strapiPutMock = vi.hoisted(() => vi.fn());
const recordLegalAcceptanceMock = vi.hoisted(() => vi.fn());

vi.mock('../strapi/strapi.client.js', () => ({
  strapiGet: strapiGetMock,
  strapiPut: strapiPutMock,
}));

vi.mock('../consent/consent.service.js', () => ({
  consentService: { recordLegalAcceptance: recordLegalAcceptanceMock },
}));

import { authComplianceService } from './auth-compliance.service.js';

const ACEITE_LEGAL = {
  termosUso: true,
  politicaPrivacidade: true,
  tratamentoDados: true,
  termosUsoVersao: 'termos-uso@2026-06-22',
  politicaPrivacidadeVersao: 'politica-privacidade@2026-06-22',
  tratamentoDadosVersao: 'tratamento-dados@2026-06-22',
  aceiteEm: '2026-06-22T10:00:00.000Z',
} as const;

describe('authComplianceService.completeLegalCompliance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    strapiGetMock.mockResolvedValue({ data: [{ id: 'perfil-1', documentId: 'perfil-doc-1' }] });
    strapiPutMock.mockResolvedValue({ data: { id: 'perfil-1' } });
    recordLegalAcceptanceMock.mockResolvedValue(undefined);
  });

  it('records legal consent and updates perfil compliance fields', async () => {
    await authComplianceService.completeLegalCompliance('user-1', 'estudante', {
      dataNascimento: '1990-01-01',
      aceiteLegal: ACEITE_LEGAL,
    });

    expect(recordLegalAcceptanceMock).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      perfilId: 'perfil-1',
      perfilDocumentId: 'perfil-doc-1',
      actorRole: 'estudante',
      source: 'reconsentimento',
      dataNascimento: '1990-01-01',
      aceiteLegal: ACEITE_LEGAL,
    }));
    expect(strapiPutMock).toHaveBeenCalledWith('/perfis/perfil-doc-1', expect.objectContaining({
      dataNascimento: '1990-01-01',
      estadoMenoridade: 'adulto',
      consentimentoEstado: 'completo',
    }));
  });

  it('rejects minor mentor before writing consent or perfil state', async () => {
    await expect(authComplianceService.completeLegalCompliance('user-1', 'mentor', {
      dataNascimento: '2014-01-01',
      aceiteLegal: ACEITE_LEGAL,
      consentimentoEncarregado: {
        nome: 'Responsável Legal',
        email: 'responsavel@example.com',
        parentesco: 'tutor_legal',
        aceite: true,
      },
    })).rejects.toMatchObject({ status: 400 });

    expect(recordLegalAcceptanceMock).not.toHaveBeenCalled();
    expect(strapiPutMock).not.toHaveBeenCalled();
  });
});

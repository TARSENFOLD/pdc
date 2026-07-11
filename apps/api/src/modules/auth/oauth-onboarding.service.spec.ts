import { describe, it, expect, vi, beforeEach } from 'vitest';

const strapiGetMock = vi.hoisted(() => vi.fn());
const strapiPutMock = vi.hoisted(() => vi.fn<(path: string, payload: Record<string, unknown>) => Promise<unknown>>());
const provisionMock = vi.hoisted(() => vi.fn());
const recordLegalAcceptanceMock = vi.hoisted(() => vi.fn());
const otpServiceMock = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
}));

vi.mock('../strapi/strapi.client.js', () => ({
  strapiGet: strapiGetMock,
  strapiPut: strapiPutMock,
}));

vi.mock('./otp.service.js', () => ({ otpService: otpServiceMock }));
vi.mock('../instituicoes/instituicao.provision.js', () => ({
  provisionInstituicaoForUser: provisionMock,
}));
vi.mock('../consent/consent.service.js', () => ({
  consentService: { recordLegalAcceptance: recordLegalAcceptanceMock },
}));

vi.mock('../../lib/env.js', () => ({
  env: { NODE_ENV: 'test' },
}));

vi.mock('pino', () => ({
  default: vi.fn(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() })),
}));

import { oauthOnboardingService } from './oauth-onboarding.service.js';

const MOCK_PERFIL = { id: 'perfil-1', userId: 'user-42' };
const MOCK_PERFIL_V5 = { id: '2', documentId: 'perfil-doc-1', userId: 'user-42' };
const ACEITE_LEGAL = {
  termosUso: true,
  politicaPrivacidade: true,
  tratamentoDados: true,
  termosUsoVersao: 'termos-uso@2026-06-22',
  politicaPrivacidadeVersao: 'politica-privacidade@2026-06-22',
  tratamentoDadosVersao: 'tratamento-dados@2026-06-22',
  aceiteEm: '2026-06-22T10:00:00.000Z',
} as const;
const DATA_NASCIMENTO_ADULTO = '1990-01-01';
const DATA_NASCIMENTO_MENOR = '2014-01-01';

describe('oauthOnboardingService.escolherRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    strapiGetMock.mockResolvedValue({ data: [MOCK_PERFIL] });
    strapiPutMock.mockResolvedValue({ data: MOCK_PERFIL });
    provisionMock.mockResolvedValue({ id: 7 });
    recordLegalAcceptanceMock.mockResolvedValue(undefined);
  });

  it('updates perfil tipo and completes OAuth onboarding for estudante without OTP', async () => {
    await oauthOnboardingService.escolherRole('user-42', {
      role: 'estudante',
      dataNascimento: DATA_NASCIMENTO_ADULTO,
      aceiteLegal: ACEITE_LEGAL,
    });

    expect(strapiGetMock).toHaveBeenCalledWith('/perfis', {
      'filters[userId][$eq]': 'user-42',
      'fields[0]': 'id',
      'fields[1]': 'documentId',
    });
    expect(strapiPutMock).toHaveBeenCalledWith('/perfis/perfil-1', expect.objectContaining({
      tipo: 'estudante',
      aprovado: true,
      oauthVerified: true,
      onboardingCompleto: true,
      consentimentoEstado: 'completo',
      estadoMenoridade: 'adulto',
      dataNascimento: DATA_NASCIMENTO_ADULTO,
    }));
    expect(recordLegalAcceptanceMock).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-42',
      perfilId: 'perfil-1',
      actorRole: 'estudante',
      source: 'oauth',
      dataNascimento: DATA_NASCIMENTO_ADULTO,
      aceiteLegal: ACEITE_LEGAL,
    }));
    expect(otpServiceMock.verifyOtp).not.toHaveBeenCalled();
  });

  it('uses Strapi documentId for v5 profile updates', async () => {
    strapiGetMock.mockResolvedValue({ data: [MOCK_PERFIL_V5] });

    await oauthOnboardingService.escolherRole('user-42', {
      role: 'estudante',
      dataNascimento: DATA_NASCIMENTO_ADULTO,
      aceiteLegal: ACEITE_LEGAL,
    });

    expect(strapiPutMock).toHaveBeenCalledWith('/perfis/perfil-doc-1', expect.objectContaining({
      tipo: 'estudante',
      aprovado: true,
      oauthVerified: true,
      onboardingCompleto: true,
    }));
    expect(recordLegalAcceptanceMock).toHaveBeenCalledWith(expect.objectContaining({
      perfilId: '2',
      perfilDocumentId: 'perfil-doc-1',
    }));
  });

  it('sets aprovado=false and saves uploaded documents for mentor', async () => {
    const documentos = [{ tipo: 'credencial_mentor', url: 'blob:http://localhost/mentor-doc' }];

    await oauthOnboardingService.escolherRole('user-42', {
      role: 'mentor',
      dataNascimento: DATA_NASCIMENTO_ADULTO,
      aceiteLegal: ACEITE_LEGAL,
      areaEspecialidade: 'TECNOLOGIA',
      documentos,
    });

    expect(strapiPutMock).toHaveBeenCalledWith('/perfis/perfil-1', expect.objectContaining({
      tipo: 'mentor',
      aprovado: false,
      areaEspecialidade: 'TECNOLOGIA',
      documentos,
    }));
  });

  it('sets aprovado=false and provisions canonical instituicao without profile organization fields', async () => {
    await oauthOnboardingService.escolherRole('user-42', {
      role: 'instituicao',
      dataNascimento: DATA_NASCIMENTO_ADULTO,
      aceiteLegal: ACEITE_LEGAL,
      nomeInstituicao: 'ISPTEC',
      tipoInstituicao: 'universidade',
    });

    expect(strapiPutMock).toHaveBeenCalledWith('/perfis/perfil-1', expect.objectContaining({
      tipo: 'instituicao',
      aprovado: false,
    }));
    expect(strapiPutMock.mock.calls.some(([path, payload]) => (
      path === '/perfis/perfil-1' && 'nomeInstituicao' in payload
    ))).toBe(false);
    expect(provisionMock).toHaveBeenCalledWith('user-42', {
      nome: 'ISPTEC',
      nomeLegal: 'ISPTEC',
      tipo: 'universidade',
    });
  });

  it('throws 404 when perfil not found', async () => {
    strapiGetMock.mockResolvedValue({ data: [] });

    await expect(
      oauthOnboardingService.escolherRole('user-42', {
        role: 'estudante',
        dataNascimento: DATA_NASCIMENTO_ADULTO,
        aceiteLegal: ACEITE_LEGAL,
      })
    ).rejects.toMatchObject({ status: 404 });
  });

  it('does not complete onboarding when append-only consent recording fails', async () => {
    recordLegalAcceptanceMock.mockRejectedValue(new Error('consent write failed'));

    await expect(oauthOnboardingService.escolherRole('user-42', {
      role: 'estudante',
      dataNascimento: DATA_NASCIMENTO_ADULTO,
      aceiteLegal: ACEITE_LEGAL,
    })).rejects.toThrow('consent write failed');

    expect(strapiPutMock).not.toHaveBeenCalled();
  });

  it('rejects mentor finalization for a minor before mutating role state', async () => {
    const documentos = [{ tipo: 'credencial_mentor', url: 'blob:http://localhost/mentor-doc' }];

    await expect(oauthOnboardingService.escolherRole('user-42', {
      role: 'mentor',
      dataNascimento: DATA_NASCIMENTO_MENOR,
      aceiteLegal: ACEITE_LEGAL,
      areaEspecialidade: 'TECNOLOGIA',
      documentos,
    })).rejects.toMatchObject({ status: 400 });

    expect(recordLegalAcceptanceMock).not.toHaveBeenCalled();
    expect(strapiPutMock).not.toHaveBeenCalled();
  });

});

describe('oauthOnboardingService.verificarOtp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    otpServiceMock.verifyOtp.mockResolvedValue(true);
    strapiGetMock.mockResolvedValue({ data: [MOCK_PERFIL] });
    strapiPutMock.mockResolvedValue({ data: MOCK_PERFIL });
  });

  it('marks perfil oauthVerified=true and onboardingCompleto=true on success', async () => {
    await oauthOnboardingService.verificarOtp('user-42', '123456');

    expect(strapiGetMock).toHaveBeenCalledWith('/perfis', {
      'filters[userId][$eq]': 'user-42',
      'fields[0]': 'id',
      'fields[1]': 'documentId',
    });
    expect(strapiPutMock).toHaveBeenCalledWith('/perfis/perfil-1', {
      oauthVerified: true,
      onboardingCompleto: true,
    });
  });

  it('throws 400 when OTP is invalid', async () => {
    otpServiceMock.verifyOtp.mockResolvedValue(false);

    await expect(
      oauthOnboardingService.verificarOtp('user-42', '000000')
    ).rejects.toMatchObject({ status: 400 });
  });

  it('throws 404 when perfil not found after valid OTP', async () => {
    otpServiceMock.verifyOtp.mockResolvedValue(true);
    strapiGetMock.mockResolvedValue({ data: [] });

    await expect(
      oauthOnboardingService.verificarOtp('user-42', '123456')
    ).rejects.toMatchObject({ status: 404 });
  });
});

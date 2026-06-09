import { describe, it, expect, vi, beforeEach } from 'vitest';

const strapiGetMock = vi.hoisted(() => vi.fn());
const strapiPutMock = vi.hoisted(() => vi.fn());
const provisionMock = vi.hoisted(() => vi.fn());
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

vi.mock('../../lib/env.js', () => ({
  env: { NODE_ENV: 'test' },
}));

vi.mock('pino', () => ({
  default: vi.fn(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() })),
}));

import { oauthOnboardingService } from './oauth-onboarding.service.js';

const MOCK_PERFIL = { id: 'perfil-1', userId: 'user-42' };
const MOCK_PERFIL_V5 = { id: '2', documentId: 'perfil-doc-1', userId: 'user-42' };

describe('oauthOnboardingService.escolherRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    strapiGetMock.mockResolvedValue({ data: [MOCK_PERFIL] });
    strapiPutMock.mockResolvedValue({ data: MOCK_PERFIL });
    provisionMock.mockResolvedValue({ id: 7 });
  });

  it('updates perfil tipo and completes OAuth onboarding for estudante without OTP', async () => {
    await oauthOnboardingService.escolherRole('user-42', { role: 'estudante' });

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
    }));
    expect(otpServiceMock.verifyOtp).not.toHaveBeenCalled();
  });

  it('uses Strapi documentId for v5 profile updates', async () => {
    strapiGetMock.mockResolvedValue({ data: [MOCK_PERFIL_V5] });

    await oauthOnboardingService.escolherRole('user-42', { role: 'estudante' });

    expect(strapiPutMock).toHaveBeenCalledWith('/perfis/perfil-doc-1', expect.objectContaining({
      tipo: 'estudante',
      aprovado: true,
      oauthVerified: true,
      onboardingCompleto: true,
    }));
  });

  it('sets aprovado=false and saves uploaded documents for mentor', async () => {
    const documentos = [{ tipo: 'credencial_mentor', url: 'blob:http://localhost/mentor-doc' }];

    await oauthOnboardingService.escolherRole('user-42', {
      role: 'mentor',
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

  it('sets aprovado=false and saves uploaded documents for instituicao', async () => {
    const documentos = [{ tipo: 'credencial_instituicao', url: 'blob:http://localhost/instituicao-doc' }];

    await oauthOnboardingService.escolherRole('user-42', {
      role: 'instituicao',
      nomeInstituicao: 'ISPTEC',
      tipoInstituicao: 'Universidade',
      documentos,
    });

    expect(strapiPutMock).toHaveBeenCalledWith('/perfis/perfil-1', expect.objectContaining({
      tipo: 'instituicao',
      aprovado: false,
      nomeInstituicao: 'ISPTEC',
      tipoInstituicao: 'Universidade',
      documentos,
    }));
    expect(provisionMock).toHaveBeenCalledWith('user-42', {
      nome: 'ISPTEC',
      tipo: 'Universidade',
      documentos,
    });
  });

  it('throws 404 when perfil not found', async () => {
    strapiGetMock.mockResolvedValue({ data: [] });

    await expect(
      oauthOnboardingService.escolherRole('user-42', { role: 'estudante' })
    ).rejects.toMatchObject({ status: 404 });
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

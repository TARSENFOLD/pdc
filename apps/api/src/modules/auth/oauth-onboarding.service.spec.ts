import { describe, it, expect, vi, beforeEach } from 'vitest';

const strapiGetMock = vi.hoisted(() => vi.fn());
const strapiPutMock = vi.hoisted(() => vi.fn());
const otpServiceMock = vi.hoisted(() => ({
  generateOtp: vi.fn(),
  storeOtp: vi.fn(),
  verifyOtp: vi.fn(),
  deleteOtp: vi.fn(),
  sendOtpEmail: vi.fn(),
}));
const authServiceMock = vi.hoisted(() => ({
  getUserById: vi.fn(),
}));

vi.mock('../strapi/strapi.client.js', () => ({
  strapiGet: strapiGetMock,
  strapiPut: strapiPutMock,
}));

vi.mock('./otp.service.js', () => ({ otpService: otpServiceMock }));

vi.mock('./auth.service.js', () => ({ authService: authServiceMock }));

vi.mock('../../lib/env.js', () => ({
  env: { NODE_ENV: 'test' },
}));

vi.mock('pino', () => ({
  default: vi.fn(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() })),
}));

import { oauthOnboardingService } from './oauth-onboarding.service.js';

const MOCK_PERFIL = { id: 'perfil-1', userId: 'user-42' };
const MOCK_USER = { id: 'user-42', email: 'user@pdc.ao' };

describe('oauthOnboardingService.escolherRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    strapiGetMock.mockResolvedValue({ data: [MOCK_PERFIL] });
    strapiPutMock.mockResolvedValue({ data: MOCK_PERFIL });
    otpServiceMock.generateOtp.mockReturnValue('123456');
    otpServiceMock.storeOtp.mockResolvedValue(undefined);
    otpServiceMock.deleteOtp.mockResolvedValue(undefined);
    otpServiceMock.sendOtpEmail.mockResolvedValue(undefined);
    authServiceMock.getUserById.mockResolvedValue(MOCK_USER);
  });

  it('updates perfil tipo + sets aprovado=true for estudante', async () => {
    await oauthOnboardingService.escolherRole('user-42', { role: 'estudante' });

    expect(strapiPutMock).toHaveBeenCalledWith('/perfis/perfil-1', expect.objectContaining({
      tipo: 'estudante',
      aprovado: true,
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
  });

  it('generates and sends OTP via email', async () => {
    await oauthOnboardingService.escolherRole('user-42', { role: 'estudante' });

    expect(otpServiceMock.generateOtp).toHaveBeenCalled();
    expect(otpServiceMock.storeOtp).toHaveBeenCalledWith('user-42', '123456', 'email');
    expect(otpServiceMock.sendOtpEmail).toHaveBeenCalledWith('user@pdc.ao', '123456');
  });

  it('throws 404 when perfil not found', async () => {
    strapiGetMock.mockResolvedValue({ data: [] });

    await expect(
      oauthOnboardingService.escolherRole('user-42', { role: 'estudante' })
    ).rejects.toMatchObject({ status: 404 });
  });

  it('rolls back perfil and removes OTP when OTP email delivery fails', async () => {
    strapiGetMock.mockResolvedValue({ data: [{ ...MOCK_PERFIL, tipo: 'estudante', aprovado: false }] });
    otpServiceMock.sendOtpEmail.mockRejectedValue(new Error('email down'));

    await expect(
      oauthOnboardingService.escolherRole('user-42', { role: 'mentor', areaEspecialidade: 'TECNOLOGIA', documentos: [] })
    ).rejects.toMatchObject({ status: 500 });

    expect(strapiPutMock).toHaveBeenLastCalledWith('/perfis/perfil-1', {
      tipo: 'estudante',
      aprovado: false,
    });
    expect(otpServiceMock.deleteOtp).toHaveBeenCalledWith('user-42', 'email');
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

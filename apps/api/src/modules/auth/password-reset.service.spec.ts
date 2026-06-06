import { beforeEach, describe, expect, it, vi } from 'vitest';
import { passwordResetService } from './password-reset.service.js';
import { strapiGetRaw, strapiPutRaw } from '../strapi/strapi.client.js';

const dependencyMocks = vi.hoisted(() => ({
  redisGet: vi.fn(),
  redisSet: vi.fn(),
  redisDel: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock('../../lib/env.js', () => ({
  env: {
    FRONTEND_URL: 'https://usepdc.com',
    RESEND_API_KEY: 'test-key',
  },
}));

vi.mock('../../lib/redis.js', () => ({
  redis: {
    get: dependencyMocks.redisGet,
    set: dependencyMocks.redisSet,
    del: dependencyMocks.redisDel,
  },
}));

vi.mock('../mail/mail.service.js', () => ({
  mailService: {
    sendEmail: dependencyMocks.sendEmail,
  },
}));

vi.mock('../strapi/strapi.client.js', () => ({
  strapiGetRaw: vi.fn(),
  strapiPutRaw: vi.fn(),
}));

describe('passwordResetService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dependencyMocks.redisSet.mockResolvedValue('OK');
    dependencyMocks.redisDel.mockResolvedValue(1);
  });

  it('não envia email quando a conta não existe', async () => {
    vi.mocked(strapiGetRaw).mockResolvedValue([]);

    await passwordResetService.request('ausente@pdc.ao');

    expect(dependencyMocks.sendEmail).not.toHaveBeenCalled();
  });

  it('guarda token com expiração e envia link para conta existente', async () => {
    vi.mocked(strapiGetRaw).mockResolvedValue([{ id: 'user-1', email: 'admin@pdc.ao' }]);
    dependencyMocks.sendEmail.mockResolvedValue({ id: 'email-1' });

    await passwordResetService.request('admin@pdc.ao');

    expect(dependencyMocks.redisSet).toHaveBeenCalledWith(
      expect.stringMatching(/^password_reset:/),
      'user-1',
      { ex: 3600 },
    );
    expect(dependencyMocks.sendEmail).toHaveBeenCalledOnce();
    const emailInput = dependencyMocks.sendEmail.mock.calls[0]?.[0] as
      | { to: string; html: string }
      | undefined;
    expect(emailInput?.to).toBe('admin@pdc.ao');
    expect(emailInput?.html).toContain('https://usepdc.com/reset-password?token=');
  });

  it('rejeita token inválido sem alterar o utilizador', async () => {
    dependencyMocks.redisGet.mockResolvedValue(null);

    await expect(passwordResetService.reset('token-invalido', 'NovaPassword123!')).resolves.toBe(false);
    expect(strapiPutRaw).not.toHaveBeenCalled();
  });

  it('altera a palavra-passe e consome o token', async () => {
    dependencyMocks.redisGet.mockResolvedValue('user-1');
    vi.mocked(strapiPutRaw).mockResolvedValue({});

    await expect(passwordResetService.reset('token-valido', 'NovaPassword123!')).resolves.toBe(true);
    expect(strapiPutRaw).toHaveBeenCalledWith('/users/user-1', {
      password: 'NovaPassword123!',
      confirmed: true,
      blocked: false,
    });
    expect(dependencyMocks.redisDel).toHaveBeenCalledOnce();
  });
});

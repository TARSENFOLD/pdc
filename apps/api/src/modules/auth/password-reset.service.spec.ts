import { beforeEach, describe, expect, it, vi } from 'vitest';
import { passwordResetService } from './password-reset.service.js';
import { strapiGetRaw, strapiPutRaw } from '../strapi/strapi.client.js';

const dependencyMocks = vi.hoisted(() => ({
  redisSet: vi.fn(),
  redisEval: vi.fn(),
  sendEmail: vi.fn(),
  revokeSessions: vi.fn(),
  revokeDevices: vi.fn(),
}));

vi.mock('../../lib/env.js', () => ({
  env: {
    FRONTEND_URL: 'https://usepdc.com',
    RESEND_API_KEY: 'test-key',
  },
}));

vi.mock('../../lib/redis.js', () => ({
  redis: {
    set: dependencyMocks.redisSet,
    eval: dependencyMocks.redisEval,
  },
}));

vi.mock('./auth-session.service.js', () => ({
  authSessionService: { revokeAll: dependencyMocks.revokeSessions },
}));

vi.mock('./trusted-device.service.js', () => ({
  trustedDeviceService: { revokeAll: dependencyMocks.revokeDevices },
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
    dependencyMocks.revokeSessions.mockResolvedValue(0);
    dependencyMocks.revokeDevices.mockResolvedValue(0);
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
    dependencyMocks.redisEval.mockResolvedValue(null);

    await expect(passwordResetService.reset('token-invalido', 'NovaPassword123!')).resolves.toBe(false);
    expect(strapiPutRaw).not.toHaveBeenCalled();
  });

  it('altera a palavra-passe e consome o token', async () => {
    dependencyMocks.redisEval
      .mockResolvedValueOnce('user-1')
      .mockResolvedValueOnce(1);
    vi.mocked(strapiPutRaw).mockResolvedValue({});

    await expect(passwordResetService.reset('token-valido', 'NovaPassword123!')).resolves.toBe(true);
    expect(strapiPutRaw).toHaveBeenCalledWith('/users/user-1', {
      password: 'NovaPassword123!',
      confirmed: true,
      blocked: false,
    });
    expect(dependencyMocks.redisEval).toHaveBeenCalledWith(
      expect.stringContaining('redis.call("DEL"'),
      [expect.stringMatching(/^password_reset:/)],
      [expect.stringMatching(/^claimed:/)],
    );
    expect(dependencyMocks.revokeSessions).toHaveBeenCalledWith('user-1');
    expect(dependencyMocks.revokeDevices).toHaveBeenCalledWith('user-1');
    expect(dependencyMocks.revokeSessions).toHaveBeenCalledTimes(2);
    expect(dependencyMocks.revokeDevices).toHaveBeenCalledTimes(2);
    const updateOrder = vi.mocked(strapiPutRaw).mock.invocationCallOrder[0] ?? 0;
    expect(dependencyMocks.revokeSessions.mock.invocationCallOrder[0]).toBeLessThan(updateOrder);
    expect(dependencyMocks.revokeSessions.mock.invocationCallOrder[1]).toBeGreaterThan(updateOrder);
  });

  it('não altera a palavra-passe se a revogação global falhar', async () => {
    dependencyMocks.redisEval
      .mockResolvedValueOnce('user-1')
      .mockResolvedValueOnce(1);
    dependencyMocks.revokeSessions.mockRejectedValue(new Error('Redis unavailable'));

    await expect(passwordResetService.reset('token-valido', 'NovaPassword123!'))
      .rejects.toThrow('Redis unavailable');
    expect(strapiPutRaw).not.toHaveBeenCalled();
    expect(dependencyMocks.redisEval).toHaveBeenLastCalledWith(
      expect.stringContaining('redis.call("PTTL"'),
      [expect.stringMatching(/^password_reset:/)],
      [expect.stringMatching(/^claimed:/), 'user-1'],
    );
  });

  it('não confirma o reset quando a revogação posterior falha', async () => {
    dependencyMocks.redisEval
      .mockResolvedValueOnce('user-1')
      .mockResolvedValueOnce(1);
    dependencyMocks.revokeSessions
      .mockResolvedValueOnce(0)
      .mockRejectedValueOnce(new Error('Redis unavailable after password update'));
    vi.mocked(strapiPutRaw).mockResolvedValue({});

    await expect(passwordResetService.reset('token-valido', 'NovaPassword123!'))
      .rejects.toThrow('Redis unavailable after password update');
    expect(strapiPutRaw).toHaveBeenCalledOnce();
    expect(dependencyMocks.redisEval).toHaveBeenCalledTimes(2);
  });

  it('confirma o reset e mantém o token reivindicado quando a limpeza final não progride', async () => {
    dependencyMocks.redisEval
      .mockResolvedValueOnce('user-1')
      .mockResolvedValueOnce(0);
    vi.mocked(strapiPutRaw).mockResolvedValue({});

    await expect(passwordResetService.reset('token-valido', 'NovaPassword123!')).resolves.toBe(true);
    expect(dependencyMocks.redisEval).toHaveBeenCalledTimes(2);
    expect(dependencyMocks.revokeSessions).toHaveBeenCalledTimes(2);
  });

  it('confirma o reset quando a limpeza final fica temporariamente indisponível', async () => {
    dependencyMocks.redisEval
      .mockResolvedValueOnce('user-1')
      .mockRejectedValueOnce(new Error('Redis unavailable during cleanup'));
    vi.mocked(strapiPutRaw).mockResolvedValue({});

    await expect(passwordResetService.reset('token-valido', 'NovaPassword123!')).resolves.toBe(true);
    expect(dependencyMocks.revokeSessions).toHaveBeenCalledTimes(2);
    expect(dependencyMocks.redisEval).toHaveBeenCalledTimes(2);
  });
});

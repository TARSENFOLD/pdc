import { createHash } from 'node:crypto';
import { decodeJwt, decodeProtectedHeader } from 'jose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@pdc/shared';

const redisMock = vi.hoisted(() => ({
  get: vi.fn(),
  eval: vi.fn(),
}));

vi.mock('../../lib/env.js', () => ({
  env: { JWT_SECRET: 'test-session-secret-at-least-32-characters' },
}));
vi.mock('../../lib/redis.js', () => ({ redis: redisMock }));

import { authSessionService } from './auth-session.service.js';
import { SESSION_TTL_SECONDS } from './auth.constants.js';
import { RefreshTokenReuseError } from './auth-session.errors.js';

const user: User = {
  id: 'user-1',
  email: 'user@example.com',
  nome: 'Ana',
  role: 'estudante',
  perfilId: 'perfil-1',
  onboardingCompleto: true,
  areasInteresse: [],
  conquistas: [],
  xp: 0,
  reputacao: 0,
  reputacaoTier: 'BRONZE',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('authSessionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisMock.eval.mockResolvedValue(1);
  });

  it('emite sessão persistente com identificador e expiração absoluta', async () => {
    const now = Math.floor(Date.now() / 1_000);
    const tokens = await authSessionService.issue(user);
    const refresh = decodeJwt(tokens.refreshToken);

    expect(decodeJwt(tokens.accessToken)).toMatchObject({
      sub: 'user-1',
      role: 'estudante',
      perfilId: 'perfil-1',
    });
    expect(decodeProtectedHeader(tokens.accessToken)).toMatchObject({ typ: 'access' });
    expect(decodeProtectedHeader(tokens.refreshToken)).toMatchObject({ typ: 'refresh' });
    expect(refresh).toMatchObject({ sub: 'user-1' });
    expect(typeof refresh.sid).toBe('string');
    expect(refresh.exp).toBeGreaterThanOrEqual(now + SESSION_TTL_SECONDS - 1);
    expect(redisMock.eval).toHaveBeenCalledWith(
      expect.stringContaining('SADD'),
      [
        `refresh_session:${String(refresh.sid)}`,
        'user_sessions:user-1',
      ],
      [expect.stringMatching(/^[a-f0-9]{64}$/), tokens.refreshMaxAgeSeconds],
    );
  });

  it('verifica a assinatura, tipo e hash persistido no caminho feliz', async () => {
    const issued = await authSessionService.issue(user);
    const refresh = decodeJwt(issued.refreshToken);
    redisMock.get.mockResolvedValueOnce(
      createHash('sha256').update(issued.refreshToken).digest('hex'),
    );

    await expect(authSessionService.verify(issued.refreshToken)).resolves.toEqual({
      userId: 'user-1',
      sessionId: refresh.sid,
      expiresAt: refresh.exp,
    });
  });

  it('preserva a expiração absoluta ao rotacionar atomicamente', async () => {
    const issued = await authSessionService.issue(user);
    const original = decodeJwt(issued.refreshToken);
    redisMock.eval.mockResolvedValueOnce(1);

    const rotated = await authSessionService.rotate(issued.refreshToken, user);

    expect(rotated).not.toBeNull();
    const next = decodeJwt(rotated?.refreshToken ?? '');
    expect(next.sid).toBe(original.sid);
    expect(next.exp).toBe(original.exp);
    expect(redisMock.eval).toHaveBeenCalledWith(
      expect.stringContaining('current ~= ARGV[1]'),
      [
        `refresh_session:${String(original.sid)}`,
        'user_sessions:user-1',
      ],
      [expect.any(String), expect.any(String), expect.any(Number)],
    );
  });

  it('não aceita uma segunda rotação do mesmo token', async () => {
    const issued = await authSessionService.issue(user);
    redisMock.eval.mockResolvedValueOnce(0);

    await expect(authSessionService.rotate(issued.refreshToken, user)).resolves.toBeNull();
  });

  it('sinaliza reutilização quando o token já foi substituído', async () => {
    const issued = await authSessionService.issue(user);
    redisMock.eval.mockResolvedValueOnce(-1);

    await expect(authSessionService.rotate(issued.refreshToken, user))
      .rejects.toBeInstanceOf(RefreshTokenReuseError);
  });

  it('invalida a família quando o hash armazenado não corresponde', async () => {
    const issued = await authSessionService.issue(user);
    redisMock.get.mockResolvedValueOnce('0'.repeat(64));

    await expect(authSessionService.verify(issued.refreshToken)).resolves.toBeNull();
    expect(redisMock.eval).toHaveBeenLastCalledWith(
      expect.stringContaining('SREM'),
      [expect.stringMatching(/^refresh_session:/), 'user_sessions:user-1'],
      [],
    );
  });

  it('revoga todas as sessões indexadas do utilizador', async () => {
    redisMock.eval
      .mockResolvedValueOnce([2, 1])
      .mockResolvedValueOnce([1, 0]);

    await expect(authSessionService.revokeAll('user-1')).resolves.toBe(3);
    expect(redisMock.eval).toHaveBeenCalledWith(
      expect.stringContaining('SPOP'),
      ['user_sessions:user-1'],
      [50],
    );
    expect(redisMock.eval).toHaveBeenCalledTimes(2);
  });
});

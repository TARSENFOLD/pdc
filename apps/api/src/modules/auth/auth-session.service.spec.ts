import { decodeJwt, decodeProtectedHeader, SignJWT } from 'jose';
import { randomUUID } from 'node:crypto';
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
import {
  AUTH_RESET_LOCK_TTL_SECONDS,
  REFRESH_ROTATION_REPLAY_TTL_SECONDS,
  SESSION_TTL_SECONDS,
} from './auth.constants.js';
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
const jwtSecret = new TextEncoder().encode('test-session-secret-at-least-32-characters');

describe('authSessionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisMock.get.mockResolvedValue(null);
    redisMock.eval.mockResolvedValue(1);
  });

  it('emite sessão persistente vinculada à época global', async () => {
    const now = Math.floor(Date.now() / 1_000);
    const tokens = await authSessionService.issue(user);
    const access = decodeJwt(tokens.accessToken);
    const refresh = decodeJwt(tokens.refreshToken);

    expect(access).toMatchObject({
      sub: 'user-1',
      role: 'estudante',
      perfilId: 'perfil-1',
      ver: 0,
    });
    expect(decodeProtectedHeader(tokens.accessToken)).toMatchObject({ typ: 'access' });
    expect(decodeProtectedHeader(tokens.refreshToken)).toMatchObject({ typ: 'refresh' });
    expect(refresh).toMatchObject({ sub: 'user-1', ver: 0 });
    expect(typeof refresh.sid).toBe('string');
    expect(refresh.exp).toBeGreaterThanOrEqual(now + SESSION_TTL_SECONDS - 1);
    expect(redisMock.eval).toHaveBeenCalledWith(
      expect.stringContaining('EXISTS'),
      [
        `refresh_session:${String(refresh.sid)}`,
        'user_sessions_v2:user-1',
        'auth_epoch:user-1',
        'auth_reset_lock:user-1',
      ],
      [
        expect.stringMatching(/^[a-f0-9]{64}$/),
        tokens.refreshMaxAgeSeconds,
        0,
        expect.any(Number),
        refresh.exp,
      ],
    );
  });

  it('recusa emitir sessão enquanto reset global está bloqueado', async () => {
    redisMock.eval.mockResolvedValueOnce(-1);

    await expect(authSessionService.issue(user)).rejects.toThrow(
      'Autenticação bloqueada durante redefinição de palavra-passe',
    );
  });

  it('verifica assinatura, época e hash persistido no caminho feliz', async () => {
    const issued = await authSessionService.issue(user);
    const refresh = decodeJwt(issued.refreshToken);
    redisMock.eval.mockResolvedValueOnce(1);

    await expect(authSessionService.verify(issued.refreshToken)).resolves.toEqual({
      userId: 'user-1',
      sessionId: refresh.sid,
      expiresAt: refresh.exp,
      issuedAt: refresh.iat,
      authEpoch: 0,
    });
  });

  it('mantém refresh tokens legados sem jti verificáveis durante a migração', async () => {
    const expiresAt = Math.floor(Date.now() / 1_000) + 600;
    const legacyToken = await new SignJWT({ sub: user.id, sid: randomUUID(), ver: 0 })
      .setProtectedHeader({ alg: 'HS256', typ: 'refresh' })
      .setIssuedAt()
      .setExpirationTime(expiresAt)
      .sign(jwtSecret);
    redisMock.eval.mockResolvedValueOnce(1);

    await expect(authSessionService.verify(legacyToken)).resolves.toMatchObject({
      userId: user.id,
      expiresAt,
      authEpoch: 0,
    });
  });

  it('aceita retry de verificação coberto pela janela idempotente', async () => {
    const issued = await authSessionService.issue(user);
    redisMock.eval.mockResolvedValueOnce(2);

    await expect(authSessionService.verify(issued.refreshToken)).resolves.toMatchObject({
      userId: 'user-1',
      authEpoch: 0,
    });
  });

  it('preserva expiração e devolve o mesmo refresh num retry de resposta perdida', async () => {
    const issued = await authSessionService.issue(user);
    const original = decodeJwt(issued.refreshToken);
    redisMock.eval.mockResolvedValueOnce(1).mockResolvedValueOnce(2);

    const rotated = await authSessionService.rotate(issued.refreshToken, user);
    const replayed = await authSessionService.rotate(issued.refreshToken, user);

    expect(rotated).not.toBeNull();
    expect(replayed?.refreshToken).toBe(rotated?.refreshToken);
    const next = decodeJwt(rotated?.refreshToken ?? '');
    expect(next.sid).toBe(original.sid);
    expect(next.exp).toBe(original.exp);
    expect(redisMock.eval).toHaveBeenCalledWith(
      expect.stringContaining('replay == current'),
      [
        `refresh_session:${String(original.sid)}`,
        'user_sessions_v2:user-1',
        expect.stringMatching(/^refresh_replay:/),
        'user_sessions:user-1',
      ],
      [expect.any(String), expect.any(String), expect.any(Number), REFRESH_ROTATION_REPLAY_TTL_SECONDS],
    );
  });

  it('sinaliza reutilização fora da janela idempotente', async () => {
    const issued = await authSessionService.issue(user);
    redisMock.eval.mockResolvedValueOnce(-1);

    await expect(authSessionService.rotate(issued.refreshToken, user))
      .rejects.toBeInstanceOf(RefreshTokenReuseError);
  });

  it('invalida a família quando a verificação deteta hash sem replay válido', async () => {
    const issued = await authSessionService.issue(user);
    redisMock.eval.mockResolvedValueOnce(-1);

    await expect(authSessionService.verify(issued.refreshToken)).resolves.toBeNull();
    expect(redisMock.eval).toHaveBeenLastCalledWith(
      expect.stringContaining('redis.call("DEL", KEYS[1])'),
      [
        expect.stringMatching(/^refresh_session:/),
        'user_sessions_v2:user-1',
        expect.stringMatching(/^refresh_replay:/),
        'user_sessions:user-1',
      ],
      [expect.stringMatching(/^[a-f0-9]{64}$/)],
    );
  });

  it('revoga somente quando o token ainda é o corrente', async () => {
    const issued = await authSessionService.issue(user);
    redisMock.eval.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

    await expect(authSessionService.revoke(issued.refreshToken)).resolves.toBe('user-1');
    await expect(authSessionService.revoke(issued.refreshToken)).resolves.toBeNull();
    expect(redisMock.eval).toHaveBeenCalledWith(
      expect.stringContaining('current ~= ARGV[1]'),
      [
        expect.stringMatching(/^refresh_session:/),
        'user_sessions_v2:user-1',
        'user_sessions:user-1',
      ],
      [expect.stringMatching(/^[a-f0-9]{64}$/)],
    );
  });

  it('torna access tokens anteriores inválidos durante revogação global', async () => {
    redisMock.get
      .mockResolvedValueOnce('2')
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('2')
      .mockResolvedValueOnce('reset-lock');

    await expect(authSessionService.isAccessTokenCurrent('user-1', 2)).resolves.toBe(true);
    await expect(authSessionService.isAccessTokenCurrent('user-1', 2)).resolves.toBe(false);
  });

  it('incrementa a época antes da limpeza e liberta apenas o próprio lock', async () => {
    redisMock.eval.mockResolvedValueOnce(3).mockResolvedValueOnce(1).mockResolvedValueOnce(1);

    const lockId = await authSessionService.beginGlobalRevocation('user-1');
    await expect(authSessionService.renewGlobalRevocation('user-1', lockId)).resolves.toBeUndefined();
    await expect(authSessionService.endGlobalRevocation('user-1', lockId)).resolves.toBeUndefined();

    expect(redisMock.eval).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('INCR'),
      ['auth_epoch:user-1', 'auth_reset_lock:user-1'],
      [lockId, AUTH_RESET_LOCK_TTL_SECONDS],
    );
    expect(redisMock.eval).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('EXPIRE'),
      ['auth_reset_lock:user-1'],
      [lockId, AUTH_RESET_LOCK_TTL_SECONDS],
    );
    expect(redisMock.eval).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('~= ARGV[1]'),
      ['auth_reset_lock:user-1'],
      [lockId],
    );
  });

  it('renova a lease durante cada lote de revogação', async () => {
    redisMock.eval
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce([1, 0])
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce([0, 0]);

    await expect(authSessionService.revokeAll('user-1', 'reset-lock-1')).resolves.toBe(1);
    expect(redisMock.eval).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('EXPIRE'),
      ['auth_reset_lock:user-1'],
      ['reset-lock-1', AUTH_RESET_LOCK_TTL_SECONDS],
    );
    expect(redisMock.eval).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('EXPIRE'),
      ['auth_reset_lock:user-1'],
      ['reset-lock-1', AUTH_RESET_LOCK_TTL_SECONDS],
    );
  });

  it('revoga todas as sessões indexadas do utilizador', async () => {
    redisMock.eval
      .mockResolvedValueOnce([2, 1])
      .mockResolvedValueOnce([1, 0])
      .mockResolvedValueOnce([2, 0]);

    await expect(authSessionService.revokeAll('user-1')).resolves.toBe(5);
    expect(redisMock.eval).toHaveBeenCalledWith(
      expect.stringContaining('ZRANGE'),
      ['user_sessions_v2:user-1'],
      [50],
    );
    expect(redisMock.eval).toHaveBeenCalledWith(
      expect.stringContaining('SPOP'),
      ['user_sessions:user-1'],
      [50],
    );
    expect(redisMock.eval).toHaveBeenCalledTimes(3);
  });
});

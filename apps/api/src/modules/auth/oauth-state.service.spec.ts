import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const redisMock = vi.hoisted(() => ({
  set: vi.fn(),
  eval: vi.fn(),
}));

vi.mock('../../lib/env.js', () => ({
  env: { JWT_SECRET: 'test-oauth-state-secret-at-least-32-chars' },
}));
vi.mock('../../lib/redis.js', () => ({
  hasPrimaryRedis: true,
  redis: redisMock,
}));

import { oauthStateService } from './oauth-state.service.js';

describe('oauthStateService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-21T12:00:00.000Z'));
    redisMock.set.mockResolvedValue('OK');
    redisMock.eval.mockResolvedValue(1);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('emite state assinado com subchave dedicada e TTL limitado', async () => {
    const state = await oauthStateService.issue();
    const [, nonce, issuedAt, signature] = state.split('.');
    const legacySignature = createHmac(
      'sha256',
      'test-oauth-state-secret-at-least-32-chars',
    ).update(`${String(nonce)}.${String(issuedAt)}`).digest('base64url');

    expect(state).toMatch(/^v2\.[^.]+\.\d+\.[A-Za-z0-9_-]+$/);
    expect(signature).not.toBe(legacySignature);
    expect(redisMock.set).toHaveBeenCalledWith(
      `oauth_state:${state}`,
      'true',
      { ex: oauthStateService.ttlSeconds },
    );
  });

  it('consome uma única vez apenas no mesmo browser', async () => {
    const state = await oauthStateService.issue();
    redisMock.eval.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

    await expect(oauthStateService.consume(state, state)).resolves.toBe(true);
    await expect(oauthStateService.consume(state, state)).resolves.toBe(false);
    await expect(oauthStateService.consume(state, 'outro-browser')).resolves.toBe(false);
    expect(redisMock.eval).toHaveBeenCalledTimes(2);
  });

  it('aceita state v1 já emitido durante a janela de migração', async () => {
    const issuedAt = Math.floor(Date.now() / 1_000).toString();
    const payload = `legacy-nonce.${issuedAt}`;
    const signature = createHmac(
      'sha256',
      'test-oauth-state-secret-at-least-32-chars',
    ).update(payload).digest('base64url');
    const legacyState = `v1.${payload}.${signature}`;

    await expect(oauthStateService.consume(legacyState, legacyState)).resolves.toBe(true);
    expect(redisMock.eval).toHaveBeenCalledWith(
      expect.stringContaining('redis.call("DEL", KEYS[1])'),
      [`oauth_state:${legacyState}`],
      [],
    );
  });

  it('aceita state legado sem prefixo emitido antes do versionamento', async () => {
    const issuedAt = Math.floor(Date.now() / 1_000).toString();
    const payload = `legacy-unversioned.${issuedAt}`;
    const signature = createHmac(
      'sha256',
      'test-oauth-state-secret-at-least-32-chars',
    ).update(payload).digest('base64url');
    const legacyState = `${payload}.${signature}`;

    await expect(oauthStateService.consume(legacyState, legacyState)).resolves.toBe(true);
    expect(redisMock.eval).toHaveBeenCalledWith(
      expect.stringContaining('redis.call("DEL", KEYS[1])'),
      [`oauth_state:${legacyState}`],
      [],
    );
  });

  it('rejeita state v2 sem todos os segmentos antes de consultar Redis', async () => {
    const malformedState = `v2.${String(Math.floor(Date.now() / 1_000))}.signature`;

    await expect(oauthStateService.consume(malformedState, malformedState)).resolves.toBe(false);
    expect(redisMock.eval).not.toHaveBeenCalled();
  });

  it('rejeita state expirado antes de consultar Redis', async () => {
    const state = await oauthStateService.issue();
    vi.advanceTimersByTime((oauthStateService.ttlSeconds + 1) * 1_000);

    await expect(oauthStateService.consume(state, state)).resolves.toBe(false);
    expect(redisMock.eval).not.toHaveBeenCalled();
  });
});

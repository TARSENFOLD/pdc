import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Sentry from '@sentry/node';

vi.mock('@sentry/node', () => ({ captureMessage: vi.fn() }));

const redisMock = vi.hoisted(() => ({
  incr: vi.fn<(key: string) => Promise<number>>(),
  expire: vi.fn<(key: string, seconds: number) => Promise<0 | 1>>(),
  eval: vi.fn<(script: string, keys: string[], args: unknown[]) => Promise<number>>(),
  lpush: vi.fn<(key: string, ...elements: unknown[]) => Promise<number>>(),
  lrem: vi.fn<(key: string, count: number, element: unknown) => Promise<number>>(),
  del: vi.fn<(key: string) => Promise<number>>(),
}));

vi.mock('../../lib/redis.js', () => ({
  telemetryRedis: redisMock,
}));

import { incrementRetry, moveToDlq, clearRetries } from './dlq.js';

const redis = redisMock;

beforeEach(() => { vi.clearAllMocks(); });

const RETRY_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days — mirrors dlq.ts

describe('incrementRetry', () => {
  it('retorna count incremental e aplica EXPIRE atomicamente via Lua', async () => {
    vi.mocked(redis.eval).mockResolvedValueOnce(3);

    const count = await incrementRetry('evt-abc');

    expect(count).toBe(3);
    expect(redis.eval).toHaveBeenCalledWith(expect.stringContaining('INCR'), ['tel:retry:evt-abc'], [RETRY_TTL_SECONDS]);
    expect(redis.incr).not.toHaveBeenCalled();
    expect(redis.expire).not.toHaveBeenCalled();
  });
});

describe('moveToDlq', () => {
  it('faz LPUSH para telemetry_dlq ANTES de LREM da processing queue', async () => {
    const callOrder: string[] = [];
    vi.mocked(redis.lpush).mockImplementationOnce(() => { callOrder.push('lpush'); return Promise.resolve(1); });
    vi.mocked(redis.lrem).mockImplementationOnce(() => { callOrder.push('lrem'); return Promise.resolve(1); });

    await moveToDlq('raw-event', 'parse error', 0, 'evt-abc');

    expect(callOrder).toEqual(['lpush', 'lrem']);
  });

  it('chama Sentry.captureMessage com level error e extras corretos', async () => {
    vi.mocked(redis.lpush).mockResolvedValueOnce(1);
    vi.mocked(redis.lrem).mockResolvedValueOnce(1);

    await moveToDlq('raw-event', 'reason-xyz', 5, 'evt-abc');

    expect(Sentry.captureMessage).toHaveBeenCalledWith('telemetry-poison-pill', {
      level: 'error',
      extra: { eventId: 'evt-abc', reason: 'reason-xyz', retries: 5 },
    });
  });
});

describe('clearRetries', () => {
  it('chama redis.del com a key correta', async () => {
    vi.mocked(redis.del).mockResolvedValueOnce(1);

    await clearRetries('evt-abc');

    expect(redis.del).toHaveBeenCalledWith('tel:retry:evt-abc');
  });
});

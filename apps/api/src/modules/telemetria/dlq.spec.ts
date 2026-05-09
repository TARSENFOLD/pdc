import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Sentry from '@sentry/node';

vi.mock('@sentry/node', () => ({ captureMessage: vi.fn() }));

vi.mock('../../lib/redis.js', () => ({
  redis: {
    incr: vi.fn(),
    expire: vi.fn(),
    lpush: vi.fn(),
    lrem: vi.fn(),
    del: vi.fn(),
  },
}));

import { redis } from '../../lib/redis.js';
import { incrementRetry, moveToDlq, clearRetries } from './dlq.js';

beforeEach(() => { vi.clearAllMocks(); });

describe('incrementRetry', () => {
  it('retorna count incremental e chama EXPIRE com 604800 (7 dias)', async () => {
    vi.mocked(redis.incr).mockResolvedValueOnce(3);
    vi.mocked(redis.expire).mockResolvedValueOnce(1);

    const count = await incrementRetry('evt-abc');

    expect(count).toBe(3);
    expect(redis.incr).toHaveBeenCalledWith('tel:retry:evt-abc');
    expect(redis.expire).toHaveBeenCalledWith('tel:retry:evt-abc', 604800);
  });
});

describe('moveToDlq', () => {
  it('faz LPUSH para telemetry_dlq ANTES de LREM da processing queue', async () => {
    const callOrder: string[] = [];
    vi.mocked(redis.lpush).mockImplementationOnce(async () => { callOrder.push('lpush'); return 1; });
    vi.mocked(redis.lrem).mockImplementationOnce(async () => { callOrder.push('lrem'); return 1; });

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

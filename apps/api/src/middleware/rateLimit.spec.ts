import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

interface MockLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  pending: Promise<unknown>;
  reason?: 'timeout' | 'cacheBlock' | 'denyList';
}

const mocks = vi.hoisted(() => {
  const configs: unknown[] = [];
  return {
    limit: vi.fn<(identity: string) => Promise<MockLimitResult>>(),
    warn: vi.fn(),
    info: vi.fn(),
    configs,
  };
});

vi.mock('@upstash/ratelimit', () => {
  class MockRatelimit {
    static slidingWindow = vi.fn(() => ({ limit: vi.fn() }));
    limit = mocks.limit;
    constructor(config: unknown) {
      mocks.configs.push(config);
    }
  }
  return { Ratelimit: MockRatelimit };
});

vi.mock('../lib/redis.js', () => ({ hasRedis: true, redis: {} }));
vi.mock('../lib/env.js', () => ({
  env: { NODE_ENV: 'test', RATE_LIMIT_PROFILE: 'strict' },
}));
vi.mock('pino', () => ({
  default: vi.fn(() => ({ warn: mocks.warn, info: mocks.info })),
}));

import {
  createRateLimit,
  getRateLimitCircuitState,
  rateLimit,
  rateLimitRegisto,
  resetMemoryBuckets,
  resetRateLimitCircuitState,
} from './rateLimit.js';

const NOW = new Date('2026-07-12T12:00:00.000Z');
const originalDevSkipOtp = process.env['DEV_SKIP_OTP'];

function allowedResult(): MockLimitResult {
  return {
    success: true,
    limit: 10,
    remaining: 9,
    reset: Date.now() + 60_000,
    pending: Promise.resolve(),
  };
}

function buildApp(keyPrefix: string, tokens = 10): Hono {
  const app = new Hono();
  app.get(
    '/',
    createRateLimit({ tokens, window: '1 m', keyPrefix, key: 'ip' }),
    (c) => c.json({ ok: true }),
  );
  return app;
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolver: ((value: T) => void) | undefined;
  const promise = new Promise<T>((resolve) => {
    resolver = resolve;
  });
  return {
    promise,
    resolve(value) {
      if (resolver === undefined) throw new Error('Deferred resolver unavailable');
      resolver(value);
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  mocks.limit.mockReset();
  mocks.limit.mockResolvedValue(allowedResult());
  mocks.warn.mockClear();
  mocks.info.mockClear();
  resetMemoryBuckets();
  resetRateLimitCircuitState();
  process.env['DEV_SKIP_OTP'] = 'false';
});

afterEach(() => {
  vi.useRealTimers();
  if (originalDevSkipOtp === undefined) delete process.env['DEV_SKIP_OTP'];
  else process.env['DEV_SKIP_OTP'] = originalDevSkipOtp;
});

describe('rate limit Redis circuit breaker', () => {
  it('configura timeout curto no cliente Upstash', () => {
    expect(mocks.configs).toContainEqual(expect.objectContaining({ timeout: 1_000 }));
  });

  it('abre por quota ate ao reset conhecido e ignora Redis enquanto open', async () => {
    const reset = Date.now() + 20 * 60_000;
    const quotaError = Object.assign(new Error('ERR max daily request limit exceeded'), { reset });
    mocks.limit.mockRejectedValueOnce(quotaError);
    const app = buildApp('quota-known');

    expect((await app.request('/')).status).toBe(200);
    expect(getRateLimitCircuitState()).toEqual({ state: 'open', reason: 'quota', retryAt: reset });
    expect((await app.request('/')).status).toBe(200);
    expect(mocks.limit).toHaveBeenCalledTimes(1);
    expect(mocks.warn).toHaveBeenCalledTimes(1);
  });

  it('usa cooldown longo quando a quota nao informa reset', async () => {
    mocks.limit.mockRejectedValueOnce(new Error('ERR max daily request limit exceeded'));
    const app = buildApp('quota-default');

    await app.request('/');
    const snapshot = getRateLimitCircuitState();
    expect(snapshot.state).toBe('open');
    expect(snapshot.reason).toBe('quota');
    expect(snapshot.retryAt).toBe(Date.now() + 30 * 60_000);
  });

  it('abre cooldown curto para network e fecha apos probe bem sucedido', async () => {
    mocks.limit.mockRejectedValueOnce(new TypeError('fetch failed'));
    const app = buildApp('network-recovery');

    await app.request('/');
    expect(getRateLimitCircuitState()).toEqual({
      state: 'open',
      reason: 'transient',
      retryAt: Date.now() + 5_000,
    });
    await vi.advanceTimersByTimeAsync(5_000);
    expect((await app.request('/')).status).toBe(200);
    expect(mocks.limit).toHaveBeenCalledTimes(2);
    expect(getRateLimitCircuitState()).toEqual({ state: 'closed' });
  });

  it('permite somente um probe half-open e envia concorrentes para memoria', async () => {
    mocks.limit.mockRejectedValueOnce(new TypeError('network unavailable'));
    const app = buildApp('half-open');
    await app.request('/');
    await vi.advanceTimersByTimeAsync(5_000);

    const probe = deferred<MockLimitResult>();
    mocks.limit.mockImplementationOnce(() => probe.promise);
    const probingRequest = app.request('/');
    await Promise.resolve();
    expect(getRateLimitCircuitState().state).toBe('half-open');

    expect((await app.request('/')).status).toBe(200);
    expect(mocks.limit).toHaveBeenCalledTimes(2);
    probe.resolve(allowedResult());
    expect((await probingRequest).status).toBe(200);
    expect(getRateLimitCircuitState()).toEqual({ state: 'closed' });
  });

  it('trata o timeout sintetico do SDK como falha transiente', async () => {
    mocks.limit.mockResolvedValueOnce({
      ...allowedResult(),
      success: true,
      limit: 0,
      remaining: 0,
      reset: 0,
      reason: 'timeout',
    });
    const app = buildApp('sdk-timeout');

    expect((await app.request('/')).status).toBe(200);
    expect(getRateLimitCircuitState().reason).toBe('transient');
  });
});

describe('fallback local de auth', () => {
  it('mantem limites de login e registo durante falha Redis', async () => {
    const authApp = new Hono();
    authApp.use('/login', rateLimit);
    authApp.post('/login', (c) => c.json({ ok: true }));
    mocks.limit.mockRejectedValueOnce(new TypeError('fetch failed'));

    for (let request = 0; request < 5; request += 1) {
      expect((await authApp.request('/login', { method: 'POST' })).status).toBe(200);
    }
    expect((await authApp.request('/login', { method: 'POST' })).status).toBe(429);

    resetMemoryBuckets();
    resetRateLimitCircuitState();
    const registerApp = new Hono();
    registerApp.use('/register', rateLimitRegisto);
    registerApp.post('/register', (c) => c.json({ ok: true }));
    mocks.limit.mockRejectedValueOnce(new TypeError('fetch failed'));
    for (let request = 0; request < 3; request += 1) {
      expect((await registerApp.request('/register', { method: 'POST' })).status).toBe(200);
    }
    expect((await registerApp.request('/register', { method: 'POST' })).status).toBe(429);
  });
});

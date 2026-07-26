import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

const getRateLimitCircuitStateMock = vi.fn<() => {
  state: 'closed' | 'open' | 'half-open';
  reason?: 'quota' | 'transient';
  retryAt?: number;
}>();
const redisHealthMock = vi.hoisted(() => ({
  hasPrimaryRedis: true,
  hasUpstashRedis: true,
  primaryReady: true,
  upstashReady: true,
}));
const isPrimaryRedisReadyMock = vi.hoisted(() => vi.fn(() => Promise.resolve(redisHealthMock.primaryReady)));
const isUpstashRedisReadyMock = vi.hoisted(() => vi.fn(() => Promise.resolve(redisHealthMock.upstashReady)));
const r2HealthMock = vi.hoisted(() => ({ configured: true, ready: true }));
const isR2ReadyMock = vi.hoisted(() => vi.fn(() => Promise.resolve(r2HealthMock.ready)));

vi.mock('../lib/env.js', () => ({
  env: {
    STRAPI_URL: 'http://strapi:1337',
  },
}));

vi.mock('../lib/redis.js', () => ({
  get hasPrimaryRedis() {
    return redisHealthMock.hasPrimaryRedis;
  },
  get hasUpstashRedis() {
    return redisHealthMock.hasUpstashRedis;
  },
  isPrimaryRedisReady: isPrimaryRedisReadyMock,
  isUpstashRedisReady: isUpstashRedisReadyMock,
}));

vi.mock('../middleware/rateLimit.js', () => ({
  getRateLimitCircuitState: getRateLimitCircuitStateMock,
}));

vi.mock('../modules/media/r2.service.js', () => ({
  isR2Configured: () => r2HealthMock.configured,
  isR2Ready: isR2ReadyMock,
}));

const { healthRoutes } = await import('./health.js');

describe('health routes', () => {
  const app = new Hono().route('/health', healthRoutes);

  beforeEach(() => {
    vi.restoreAllMocks();
    redisHealthMock.hasPrimaryRedis = true;
    redisHealthMock.hasUpstashRedis = true;
    redisHealthMock.primaryReady = true;
    redisHealthMock.upstashReady = true;
    r2HealthMock.configured = true;
    r2HealthMock.ready = true;
    isR2ReadyMock.mockClear();
    getRateLimitCircuitStateMock.mockReturnValue({ state: 'closed' });
  });

  it('reports media storage as degraded when R2 rejects the configured credentials', async () => {
    r2HealthMock.ready = false;

    const response = await app.request('/health/media-storage');

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      status: 'degraded',
      dependency: 'down',
    });
  });

  it('reports configured and write-capable media storage as ready', async () => {
    const response = await app.request('/health/media-storage');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: 'ready',
      dependency: 'up',
    });
  });

  it('reports media storage as unconfigured without invoking the provider', async () => {
    r2HealthMock.configured = false;

    const response = await app.request('/health/media-storage');

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      status: 'degraded',
      dependency: 'unconfigured',
    });
    expect(isR2ReadyMock).not.toHaveBeenCalled();
  });

  it('keeps liveness independent from external dependencies', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await app.request('/health');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: 'ok' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports ready when Strapi and Redis are available', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('ok', { status: 200 })));

    const response = await app.request('/health/ready');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: 'ready',
      dependencies: { strapi: 'up', sessionRedis: 'up', rateLimitRedis: 'up' },
    });
  });

  it('reports degraded while the Redis quota circuit is open', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('ok', { status: 200 })));
    getRateLimitCircuitStateMock.mockReturnValue({
      state: 'open',
      reason: 'quota',
      retryAt: Date.now() + 60_000,
    });

    const response = await app.request('/health/ready');

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      status: 'degraded',
      dependencies: { strapi: 'up', sessionRedis: 'up', rateLimitRedis: 'degraded' },
      rateLimitCircuit: { state: 'open', reason: 'quota' },
    });
  });

  it('reports degraded when Strapi is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    const response = await app.request('/health/ready');

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      status: 'degraded',
      dependencies: { strapi: 'down', sessionRedis: 'up', rateLimitRedis: 'up' },
    });
  });

  it('reports the primary Redis as unconfigured without masking Upstash health', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('ok', { status: 200 })));
    redisHealthMock.hasPrimaryRedis = false;
    redisHealthMock.primaryReady = false;

    const response = await app.request('/health/ready');

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      status: 'degraded',
      dependencies: { strapi: 'up', sessionRedis: 'unconfigured', rateLimitRedis: 'up' },
    });
  });

  it('reports a configured but unreachable primary Redis as down', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('ok', { status: 200 })));
    redisHealthMock.primaryReady = false;

    const response = await app.request('/health/ready');

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      status: 'degraded',
      dependencies: { strapi: 'up', sessionRedis: 'down', rateLimitRedis: 'up' },
    });
  });

  it('reports Upstash as unconfigured without masking a healthy primary Redis', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('ok', { status: 200 })));
    redisHealthMock.hasUpstashRedis = false;

    const response = await app.request('/health/ready');

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      status: 'degraded',
      dependencies: { strapi: 'up', sessionRedis: 'up', rateLimitRedis: 'unconfigured' },
    });
  });

  it('reports Upstash as down when the configured endpoint fails its probe', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('ok', { status: 200 })));
    redisHealthMock.upstashReady = false;

    const response = await app.request('/health/ready');

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      status: 'degraded',
      dependencies: { strapi: 'up', sessionRedis: 'up', rateLimitRedis: 'down' },
    });
  });
});

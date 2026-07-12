import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

const getRateLimitCircuitStateMock = vi.fn<() => {
  state: 'closed' | 'open' | 'half-open';
  reason?: 'quota' | 'transient';
  retryAt?: number;
}>();

vi.mock('../lib/env.js', () => ({
  env: {
    STRAPI_URL: 'http://strapi:1337',
  },
}));

vi.mock('../lib/redis.js', () => ({
  hasRedis: true,
}));

vi.mock('../middleware/rateLimit.js', () => ({
  getRateLimitCircuitState: getRateLimitCircuitStateMock,
}));

const { healthRoutes } = await import('./health.js');

describe('health routes', () => {
  const app = new Hono().route('/health', healthRoutes);

  beforeEach(() => {
    vi.restoreAllMocks();
    getRateLimitCircuitStateMock.mockReturnValue({ state: 'closed' });
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
      dependencies: { strapi: 'up', rateLimitRedis: 'up' },
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
      dependencies: { strapi: 'up', rateLimitRedis: 'degraded' },
      rateLimitCircuit: { state: 'open', reason: 'quota' },
    });
  });

  it('reports degraded when Strapi is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    const response = await app.request('/health/ready');

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      status: 'degraded',
      dependencies: { strapi: 'down', rateLimitRedis: 'up' },
    });
  });
});

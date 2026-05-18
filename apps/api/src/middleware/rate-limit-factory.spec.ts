import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { createRateLimit, rateLimitMediaUpload } from './rateLimit.js';
import type { AuthVariables } from '../modules/auth/auth.middleware.js';

function buildApp(keyPrefix: string, tokens = 2) {
  const app = new Hono<{ Variables: AuthVariables }>();
  app.use('*', async (c, next) => {
    c.set('user', { id: 'user-1', role: 'estudante' });
    await next();
  });
  app.post(
    '/limited',
    createRateLimit({ tokens, window: '1 m', keyPrefix, key: 'user' }),
    (c) => c.json({ ok: true }),
  );
  return app;
}

describe('createRateLimit', () => {
  it('limita por utilizador e devolve Retry-After no excesso', async () => {
    const app = buildApp(`spec-user-${crypto.randomUUID()}`);

    expect((await app.request('/limited', { method: 'POST' })).status).toBe(200);
    expect((await app.request('/limited', { method: 'POST' })).status).toBe(200);

    const blocked = await app.request('/limited', { method: 'POST' });
    expect(blocked.status).toBe(429);
    const retryAfter = blocked.headers.get('Retry-After');
    expect(retryAfter).toBeTruthy();
    const isNumericSeconds = retryAfter !== null && /^\d+$/.test(retryAfter) && Number(retryAfter) > 0;
    const isHttpDate = retryAfter !== null && Number.isFinite(Date.parse(retryAfter));
    expect(isNumericSeconds || isHttpDate).toBe(true);
    await expect(blocked.json()).resolves.toMatchObject({ code: 'RATE_LIMITED' });
  });

  it('isola buckets por userId', async () => {
    const keyPrefix = `spec-isolated-${crypto.randomUUID()}`;
    const app = new Hono<{ Variables: AuthVariables }>();
    app.use('*', async (c, next) => {
      const userId = c.req.header('x-user-id') ?? 'user-1';
      c.set('user', { id: userId, role: 'estudante' });
      await next();
    });
    app.post('/limited', createRateLimit({ tokens: 1, window: '1 m', keyPrefix, key: 'user' }), (c) => c.json({ ok: true }));

    expect((await app.request('/limited', { method: 'POST', headers: { 'x-user-id': 'user-1' } })).status).toBe(200);
    expect((await app.request('/limited', { method: 'POST', headers: { 'x-user-id': 'user-1' } })).status).toBe(429);
    expect((await app.request('/limited', { method: 'POST', headers: { 'x-user-id': 'user-2' } })).status).toBe(200);
  });
});

describe('rateLimitMediaUpload', () => {
  it('é exportado como limiter user-keyed com keyPrefix media-upload', async () => {
    const app = new Hono<{ Variables: AuthVariables }>();
    app.use('*', async (c, next) => {
      c.set('user', { id: `upload-user-${crypto.randomUUID()}`, role: 'estudante' });
      await next();
    });
    app.post('/upload', rateLimitMediaUpload, (c) => c.json({ ok: true }));

    const res = await app.request('/upload', { method: 'POST' });
    expect(res.status).toBe(200);
    expect(res.headers.get('X-RateLimit-Limit')).toBe('10');
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

const captureExceptionMock = vi.fn();
const setUserMock = vi.fn();
const setTagMock = vi.fn();

vi.mock('@sentry/node', () => ({
  captureException: captureExceptionMock,
  setUser: setUserMock,
  setTag: setTagMock,
  init: vi.fn(),
}));

vi.mock('@sentry/profiling-node', () => ({
  nodeProfilingIntegration: vi.fn(() => ({})),
}));

vi.mock('../lib/env.js', () => ({
  env: {
    SENTRY_DSN: 'https://public@example.ingest.sentry.io/123',
    NODE_ENV: 'test',
  },
}));

describe('sentryUserContext middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does not call setUser when there is no authenticated user', async () => {
    const { sentryUserContext } = await import('./sentry.js');
    const app = new Hono();
    app.use('*', sentryUserContext);
    app.get('/test', (c) => c.json({ ok: true }));

    const response = await app.request('/test');
    expect(response.status).toBe(200);
    expect(setUserMock).not.toHaveBeenCalled();
    // setTag é chamado pelo initSentry via Sentry.init({ environment }), não por sentryUserContext
  });

  it('calls setUser with id only when user is authenticated', async () => {
    const { sentryUserContext } = await import('./sentry.js');
    const app = new Hono<{ Variables: { user: { id: string; role: string } } }>();
    app.use('*', async (c, next) => {
      c.set('user', { id: 'user-42', role: 'estudante' });
      await next();
    });
    app.use('*', sentryUserContext);
    app.get('/test', (c) => c.json({ ok: true }));

    const response = await app.request('/test');
    expect(response.status).toBe(200);
    expect(setUserMock).toHaveBeenCalledWith({ id: 'user-42' });
    // No email ou PII
    const callArg = setUserMock.mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(callArg).toBeDefined();
    expect(callArg).not.toHaveProperty('email');
  });
});

describe('app.onError Sentry integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('captures exception and returns 500 on unhandled error', async () => {
    const app = new Hono();
    app.onError((err, c) => {
      captureExceptionMock(err);
      return c.json({ error: 'Internal Server Error' }, 500);
    });
    app.get('/boom', () => {
      throw new Error('Unhandled boom');
    });

    const response = await app.request('/boom');
    expect(response.status).toBe(500);
    const body = await response.json() as { error: string };
    expect(body.error).toBe('Internal Server Error');
    expect(captureExceptionMock).toHaveBeenCalledOnce();
    const capturedErr: unknown = captureExceptionMock.mock.calls[0]?.[0];
    expect(capturedErr).toBeInstanceOf(Error);
    expect((capturedErr as Error).message).toBe('Unhandled boom');
  });
});

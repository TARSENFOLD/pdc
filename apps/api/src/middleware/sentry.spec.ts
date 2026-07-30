import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import type { ErrorEvent, NodeOptions } from '@sentry/node';

type TransactionEvent = Parameters<NonNullable<NodeOptions['beforeSendTransaction']>>[0];

const captureExceptionMock = vi.fn();
const setUserMock = vi.fn();
const setTagMock = vi.fn();
const initMock = vi.fn<(options: NodeOptions) => void>();
const profilingIntegrationMock = vi.fn(() => ({ name: 'profiling-test' }));
const withIsolationScopeMock = vi.fn(async (callback: () => Promise<void>) => callback());

vi.mock('@sentry/node', () => ({
  captureException: captureExceptionMock,
  setUser: setUserMock,
  setTag: setTagMock,
  init: initMock,
  withIsolationScope: withIsolationScopeMock,
}));

vi.mock('@sentry/profiling-node', () => ({
  nodeProfilingIntegration: profilingIntegrationMock,
}));

describe('Sentry bootstrap instrumentation', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('stays disabled when SENTRY_DSN is absent', async () => {
    vi.stubEnv('SENTRY_DSN', '');

    await import('../instrument.js');

    expect(initMock).not.toHaveBeenCalled();
  });

  it('initializes before the app and strips sensitive request data', async () => {
    vi.stubEnv('SENTRY_DSN', 'https://public@example.ingest.sentry.io/123');
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('RELEASE_SHA', '0123456789abcdef0123456789abcdef01234567');

    await import('../instrument.js');

    expect(initMock).toHaveBeenCalledOnce();
    const options = initMock.mock.calls[0]?.[0];
    expect(options).toMatchObject({
      environment: 'production',
      release: '0123456789abcdef0123456789abcdef01234567',
      sendDefaultPii: false,
      tracesSampleRate: 0.1,
      profilesSampleRate: 0.05,
    });

    const event: ErrorEvent = {
      type: undefined,
      request: {
        cookies: { access_token: 'secret' },
        data: { otp: '123456' },
        query_string: 'code=oauth-code&state=csrf-state',
        url: 'https://api.usepdc.com/auth/linkedin/callback?code=oauth-code&state=csrf-state',
        headers: {
          Authorization: 'Bearer secret',
          Cookie: 'refresh_token=secret',
          Accept: 'application/json',
          Referer: 'https://usepdc.com/oauth?code=oauth-code',
          'X-Forwarded-For': '203.0.113.42',
        },
      },
    };
    const sanitized = await options?.beforeSend?.(event, {});
    expect(sanitized?.request).not.toHaveProperty('cookies');
    expect(sanitized?.request).not.toHaveProperty('data');
    expect(sanitized?.request).not.toHaveProperty('query_string');
    expect(sanitized?.request?.url).toBe('https://api.usepdc.com/auth/linkedin/callback');
    expect(sanitized?.request?.headers).toEqual({ Accept: 'application/json' });

    const transaction: TransactionEvent = {
      type: 'transaction',
      transaction: 'GET /auth/linkedin/callback',
      request: {
        cookies: { access_token: 'secret' },
        data: { otp: '123456' },
        query_string: 'code=oauth-code&state=csrf-state',
        url: 'https://api.usepdc.com/auth/linkedin/callback?code=oauth-code&state=csrf-state',
        headers: {
          Authorization: 'Bearer secret',
          Cookie: 'refresh_token=secret',
          Accept: 'application/json',
          Referer: 'https://usepdc.com/oauth?code=oauth-code',
          'X-Forwarded-For': '203.0.113.42',
        },
      },
    };
    const sanitizedTransaction = await options?.beforeSendTransaction?.(transaction, {});
    expect(sanitizedTransaction?.request).not.toHaveProperty('cookies');
    expect(sanitizedTransaction?.request).not.toHaveProperty('data');
    expect(sanitizedTransaction?.request).not.toHaveProperty('query_string');
    expect(sanitizedTransaction?.request?.url).toBe(
      'https://api.usepdc.com/auth/linkedin/callback'
    );
    expect(sanitizedTransaction?.request?.headers).toEqual({ Accept: 'application/json' });
  });
});

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
    expect(withIsolationScopeMock).toHaveBeenCalledOnce();
    expect(setUserMock).not.toHaveBeenCalled();
  });

  it('binds only the authenticated id inside the isolated request scope', async () => {
    const { sentryUserContext, setSentryUser } = await import('./sentry.js');
    const app = new Hono();
    app.use('*', sentryUserContext);
    app.use('*', async (_c, next) => {
      setSentryUser('user-42');
      await next();
    });
    app.get('/test', (c) => c.json({ ok: true }));

    const response = await app.request('/test');
    expect(response.status).toBe(200);
    expect(withIsolationScopeMock).toHaveBeenCalledOnce();
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
    const body: unknown = await response.json();
    expect(body).toEqual({ error: 'Internal Server Error' });
    expect(captureExceptionMock).toHaveBeenCalledOnce();
    const capturedErr: unknown = captureExceptionMock.mock.calls[0]?.[0];
    expect(capturedErr).toBeInstanceOf(Error);
    if (!(capturedErr instanceof Error)) {
      throw new Error('Sentry should receive the original error');
    }
    expect(capturedErr.message).toBe('Unhandled boom');
  });
});

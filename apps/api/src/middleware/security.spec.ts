import { afterEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

describe('securityMiddleware CSP', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('remove unsafe-inline de script-src em produção e inclui destinos de conexão', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('R2_PUBLIC_URL', 'https://media.example.com/assets');
    vi.stubEnv('SENTRY_DSN', 'https://public@example.ingest.sentry.io/123');
    vi.stubEnv('EDGE_PUBLIC_URL', 'https://edge.example.com');
    vi.stubEnv('R2_ACCOUNT_ID', 'account');
    vi.stubEnv('R2_ACCESS_KEY_ID', 'access');
    vi.stubEnv('R2_SECRET_ACCESS_KEY', 'secret');
    vi.stubEnv('RESEND_API_KEY', 'resend-key');

    const { securityMiddleware } = await import('./security.js');
    const app = new Hono();
    app.use('*', securityMiddleware);
    app.get('/health', (c) => c.json({ ok: true }));

    const response = await app.request('/health');
    const csp = response.headers.get('Content-Security-Policy') ?? '';

    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).toContain('https://media.example.com');
    expect(csp).toContain('https://example.ingest.sentry.io');
    expect(csp).toContain('https://edge.example.com');
  });

  it('produção: connect-src não contém wildcard https: — lista apenas origins explícitos', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('R2_PUBLIC_URL', 'https://media.example.com/assets');
    vi.stubEnv('SENTRY_DSN', 'https://public@example.ingest.sentry.io/123');
    vi.stubEnv('EDGE_PUBLIC_URL', 'https://edge.example.com');
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.upstash.io');
    vi.stubEnv('R2_ACCOUNT_ID', 'account');
    vi.stubEnv('R2_ACCESS_KEY_ID', 'access');
    vi.stubEnv('R2_SECRET_ACCESS_KEY', 'secret');
    vi.stubEnv('RESEND_API_KEY', 'resend-key');

    const { securityMiddleware } = await import('./security.js');
    const app = new Hono();
    app.use('*', securityMiddleware);
    app.get('/health', (c) => c.json({ ok: true }));

    const response = await app.request('/health');
    const csp = response.headers.get('Content-Security-Policy') ?? '';
    const connectSrc = csp.split(';').find((d) => d.trim().startsWith('connect-src')) ?? '';

    expect(connectSrc).not.toContain(' https: ');
    expect(connectSrc).toContain("'self'");
    expect(connectSrc).toContain('https://media.example.com');
    expect(connectSrc).toContain('https://redis.upstash.io');
  });

  it('inclui frame-src com youtube/vimeo e mantém frame-ancestors none', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('R2_PUBLIC_URL', 'https://media.example.com/assets');
    vi.stubEnv('R2_ACCOUNT_ID', 'account');
    vi.stubEnv('R2_ACCESS_KEY_ID', 'access');
    vi.stubEnv('R2_SECRET_ACCESS_KEY', 'secret');
    vi.stubEnv('RESEND_API_KEY', 'resend-key');

    const { securityMiddleware } = await import('./security.js');
    const app = new Hono();
    app.use('*', securityMiddleware);
    app.get('/health', (c) => c.json({ ok: true }));

    const response = await app.request('/health');
    const csp = response.headers.get('Content-Security-Policy') ?? '';

    expect(csp).toContain("frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com");
    expect(csp).toContain("frame-ancestors 'none'");
  });
});

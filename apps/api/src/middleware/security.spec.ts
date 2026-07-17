import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

const productionEnv = {
  NODE_ENV: 'production',
  API_URL: 'https://api.example.com',
  FRONTEND_URL: 'https://app.example.com',
  STRAPI_URL: 'https://strapi.example.com',
  STRAPI_API_TOKEN: 'strapi-token',
  JWT_SECRET: 'jwt-secret-123456789012345678901234567890',
  PDC_REDIS_URL: 'redis://pdc:test-password@redis:6379',
  UPSTASH_REDIS_REST_URL: 'https://redis.upstash.io',
  UPSTASH_REDIS_REST_TOKEN: 'redis-token',
  R2_PUBLIC_URL: 'https://media.example.com',
  R2_ACCOUNT_ID: 'account',
  R2_ACCESS_KEY_ID: 'access',
  R2_SECRET_ACCESS_KEY: 'secret',
  WEB_PUSH_PUBLIC_KEY: 'web-push-public',
  WEB_PUSH_PRIVATE_KEY: 'web-push-private',
  WEB_PUSH_SUBJECT: 'mailto:ops@example.com',
  RESEND_API_KEY: 'resend-key',
  RESEND_FROM_EMAIL: 'no-reply@example.com',
  DEEPSEEK_API_KEY: 'deepseek-key',
  AI_PROVIDER: 'deepseek',
  SENTRY_DSN: 'https://public@example.ingest.sentry.io/123',
  EDGE_PUBLIC_URL: 'https://edge.example.com',
};

describe('securityMiddleware CSP', () => {
  beforeEach(() => {
    Object.entries(productionEnv).forEach(([key, value]) => {
      vi.stubEnv(key, value);
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('remove unsafe-inline de script-src em produção e inclui destinos de conexão', async () => {

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

    const { securityMiddleware } = await import('./security.js');
    const app = new Hono();
    app.use('*', securityMiddleware);
    app.get('/health', (c) => c.json({ ok: true }));

    const response = await app.request('/health');
    const csp = response.headers.get('Content-Security-Policy') ?? '';

    const frameSrc = csp.split(';').find((d) => d.trim().startsWith('frame-src')) ?? '';
    expect(frameSrc).toContain("'self'");
    expect(frameSrc).toContain('https://www.youtube.com');
    expect(frameSrc).toContain('https://www.youtube-nocookie.com');
    expect(frameSrc).toContain('https://player.vimeo.com');
    expect(csp).toContain("frame-ancestors 'none'");
  });
});

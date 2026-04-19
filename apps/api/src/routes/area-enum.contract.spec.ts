import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do env ANTES de qualquer outro import que dependa dele
vi.mock('../lib/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    JWT_SECRET: 'super-secret-at-least-32-chars-long',
    STRAPI_API_TOKEN: 'token',
    STRAPI_URL: 'http://localhost:1337',
    PORT: '3001',
    FRONTEND_URL: 'http://localhost:5173',
  }
}));

// Mock do ratelimit
vi.mock('@upstash/ratelimit', () => {
  function Ratelimit() {
    return {
      limit: vi.fn().mockResolvedValue({ success: true, limit: 10, reset: Date.now(), remaining: 9 }),
    };
  }
  Object.assign(Ratelimit, { slidingWindow: vi.fn() });
  return { Ratelimit };
});

import { Hono } from 'hono';
import { catalogoRoutes } from './catalogo.js';
import { landingRoutes } from './landing.js';

// Mocks de serviços
vi.mock('../modules/strapi/strapi.client.js', () => ({
  strapiGet: vi.fn().mockResolvedValue({ data: [], meta: { pagination: { total: 0 } } }),
}));

vi.mock('../modules/landing/pulse.service.js', () => ({
  pulseService: {
    recordActivity: vi.fn(),
  },
}));

vi.mock('../middleware/cache.js', () => ({
  withPublicCache: () => async (_c: unknown, next: () => Promise<void>) => { await next(); },
}));

describe('AreaVocacional Enum Contract', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/catalogo', catalogoRoutes);
    app.route('/landing', landingRoutes);
  });

  it('GET /catalogo/cursos deve retornar 400 para area inválida', async () => {
    const res = await app.request('/catalogo/cursos?area=informatica');
    expect(res.status).toBe(400);
  });

  it('GET /catalogo/cursos deve retornar 200 para area válida (TECNOLOGIA)', async () => {
    const res = await app.request('/catalogo/cursos?area=TECNOLOGIA');
    expect(res.status).toBe(200);
  });

  it('POST /landing/pulse deve retornar 400 para area inválida', async () => {
    const res = await app.request('/landing/pulse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: '123', area: 'invalida' }),
    });
    expect(res.status).toBe(400);
  });

  it('POST /landing/pulse deve retornar 200 para area válida (SAUDE)', async () => {
    const res = await app.request('/landing/pulse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: '123', area: 'SAUDE' }),
    });
    expect(res.status).toBe(200);
  });
});

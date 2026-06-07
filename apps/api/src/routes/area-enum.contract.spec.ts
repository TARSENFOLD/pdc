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
import { LandingVereditoSchema } from '@pdc/shared';
import { catalogoRoutes } from './catalogo.js';
import { landingRoutes } from './landing.js';

// Mocks de serviços
vi.mock('../modules/strapi/strapi.client.js', () => ({
  strapiGet: vi.fn().mockResolvedValue({ data: [], meta: { pagination: { total: 0 } } }),
  strapiGetRaw: vi.fn(),
}));

vi.mock('../modules/landing/pulse.service.js', () => ({
  pulseService: {
    recordActivity: vi.fn(),
  },
}));

vi.mock('../modules/tina/tina.service.js', () => ({
  tinaService: {
    gerarPerguntasDesafio: vi.fn().mockResolvedValue([]),
    gerarVereditoDesafio: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('../middleware/cache.js', () => ({
  withPublicCache: () => async (_c: unknown, next: () => Promise<void>) => { await next(); },
}));

const CANONICAL_AREAS = [
  'SAUDE', 'ENGENHARIA', 'TECNOLOGIA', 'DIREITO', 'GESTAO',
  'EDUCACAO', 'ARTES', 'CIENCIAS_AGRARIAS', 'CIENCIAS_SOCIAIS',
  'COMUNICACAO', 'CIENCIAS_NATURAIS', 'ARQUITETURA',
  'TURISMO_HOTELARIA', 'DESPORTO', 'OUTRA',
] as const;

const LEGACY_AREAS = ['AGRONOMIA', 'OUTRO'] as const;

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

  it.each(CANONICAL_AREAS)(
    'GET /catalogo/cursos deve aceitar área canónica %s',
    async (area) => {
      const res = await app.request(`/catalogo/cursos?area=${area}`);
      expect(res.status).toBe(200);
    },
  );

  it.each(LEGACY_AREAS)(
    'GET /catalogo/cursos deve rejeitar área legada %s (drift bloqueado)',
    async (area) => {
      const res = await app.request(`/catalogo/cursos?area=${area}`);
      expect(res.status).toBe(400);
    },
  );

  it.each(CANONICAL_AREAS)(
    'POST /landing/pulse deve aceitar área canónica %s',
    async (area) => {
      const res = await app.request('/landing/pulse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: '123', area }),
      });
      expect(res.status).toBe(200);
    },
  );

  it('POST /landing/veredito devolve um diagnóstico público válido', async () => {
    const res = await app.request('/landing/veredito', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        area: 'TECNOLOGIA',
        contexto: 'Gosto de programação e de resolver problemas.',
        respostas: ['A', 'B', 'C', 'D', 'A'],
      }),
    });

    expect(res.status).toBe(200);
    const parsed = LandingVereditoSchema.parse(await res.json());
    expect(parsed.area).toBe('TECNOLOGIA');
    expect(parsed.simulacoes).toHaveLength(3);
  });

  it('POST /landing/veredito rejeita um desafio incompleto', async () => {
    const res = await app.request('/landing/veredito', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        area: 'TECNOLOGIA',
        contexto: 'Gosto de programação.',
        respostas: ['A'],
      }),
    });

    expect(res.status).toBe(400);
  });
});

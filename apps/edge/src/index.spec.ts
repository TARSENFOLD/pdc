import type { Context, Next } from 'hono';
import { describe, expect, it, vi, beforeEach } from 'vitest';

interface ErrorResponse {
  error: string;
  details?: unknown;
}

interface BatchSuccessResponse {
  success: boolean;
  count: number;
  deduped: number;
}

interface HealthResponse {
  status: string;
  version: string;
  region: string;
  uptime: number;
}

// Mock the JWKS middleware so batch tests aren't blocked by JWT validation
vi.mock('./middleware/jws-verify', () => ({
  jwsVerifyMiddleware: vi.fn(async (_c: Context, next: Next) => {
    _c.set('userId', 'user-test-123');
    _c.set('perfilId', 'perfil-test-456');
    await next();
  }),
}));

// Must import app AFTER mocking the middleware
const { default: app } = await import('./index');

const VALID_EVENT = {
  eventId: '550e8400-e29b-41d4-a716-446655440000',
  tipo: 'page.viewed',
  timestamp: new Date().toISOString(),
  payload: {},
};

const REDIS_OK = JSON.stringify([{ result: 'OK' }]);
const REDIS_NULL = JSON.stringify([{ result: null }]);

function makeEnv(overrides: Record<string, string> = {}) {
  return {
    UPSTASH_REDIS_REST_URL: 'https://fake.upstash.io',
    UPSTASH_REDIS_REST_TOKEN: 'test-token',
    BFF_URL: 'http://bff.local',
    TELEMETRY_SECRET: 'secret',
    ...overrides,
  };
}

describe('GET /health', () => {
  it('responde 200 com status ok', async () => {
    const req = new Request('http://edge/health');
    const res = await app.fetch(req, makeEnv());
    expect(res.status).toBe(200);
    const body: HealthResponse = await res.json();
    expect(body.status).toBe('ok');
    expect(body.version).toBeDefined();
    expect(typeof body.uptime).toBe('number');
  });
});

describe('POST /telemetria/batch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejeita payload inválido com 400', async () => {
    const req = new Request('http://edge/telemetria/batch', {
      method: 'POST',
      body: JSON.stringify({ events: [] }), // min(1) violation
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await app.fetch(req, makeEnv());
    expect(res.status).toBe(400);
    const body: ErrorResponse = await res.json();
    expect(body.error).toContain('inválido');
  });

  it('rejeita JSON malformado com 400', async () => {
    const req = new Request('http://edge/telemetria/batch', {
      method: 'POST',
      body: '{ invalid json }',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await app.fetch(req, makeEnv());
    expect(res.status).toBe(400);
    const body: ErrorResponse = await res.json();
    expect(body.error).toBe('JSON inválido');
  });

  it('processa batch válido e devolve count correto', async () => {
    vi.stubGlobal('fetch', vi.fn()
      // 1st call: pipeline SET NX → OK (new event)
      .mockResolvedValueOnce(new Response(REDIS_OK, { status: 200 }))
      // 2nd call: LPUSH to queue
      .mockResolvedValueOnce(new Response(JSON.stringify({ result: 1 }), { status: 200 })),
    );

    const req = new Request('http://edge/telemetria/batch', {
      method: 'POST',
      body: JSON.stringify({ events: [VALID_EVENT] }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await app.fetch(req, makeEnv());
    expect(res.status).toBe(202);
    const body: BatchSuccessResponse = await res.json();
    expect(body.success).toBe(true);
    expect(body.count).toBe(1);
    expect(body.deduped).toBe(0);
  });

  it('deduplica evento já visto e devolve count=0 deduped=1', async () => {
    vi.stubGlobal('fetch', vi.fn()
      // pipeline SET NX → null (key already exists)
      .mockResolvedValueOnce(new Response(REDIS_NULL, { status: 200 })),
    );

    const req = new Request('http://edge/telemetria/batch', {
      method: 'POST',
      body: JSON.stringify({ events: [VALID_EVENT] }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await app.fetch(req, makeEnv());
    expect(res.status).toBe(202);
    const body: BatchSuccessResponse = await res.json();
    expect(body.success).toBe(true);
    expect(body.count).toBe(0);
    expect(body.deduped).toBe(1);
  });

  it('devolve 503 se Redis pipeline falhar', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response('error', { status: 500 })),
    );

    const req = new Request('http://edge/telemetria/batch', {
      method: 'POST',
      body: JSON.stringify({ events: [VALID_EVENT] }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await app.fetch(req, makeEnv());
    expect(res.status).toBe(503);
  });

  it('devolve 503 se LPUSH falhar depois da dedup', async () => {
    vi.stubGlobal('fetch', vi.fn()
      // pipeline OK
      .mockResolvedValueOnce(new Response(REDIS_OK, { status: 200 }))
      // LPUSH fails
      .mockResolvedValueOnce(new Response('error', { status: 500 })),
    );

    const req = new Request('http://edge/telemetria/batch', {
      method: 'POST',
      body: JSON.stringify({ events: [VALID_EVENT] }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await app.fetch(req, makeEnv());
    expect(res.status).toBe(503);
  });

  it('batch parcial: processa apenas eventos novos e conta deduped', async () => {
    const event2 = { ...VALID_EVENT, eventId: '660e8400-e29b-41d4-a716-446655440000' };
    vi.stubGlobal('fetch', vi.fn()
      // pipeline: first event new (OK), second event dup (null)
      .mockResolvedValueOnce(new Response(JSON.stringify([{ result: 'OK' }, { result: null }]), { status: 200 }))
      // LPUSH for the 1 new event
      .mockResolvedValueOnce(new Response(JSON.stringify({ result: 1 }), { status: 200 })),
    );

    const req = new Request('http://edge/telemetria/batch', {
      method: 'POST',
      body: JSON.stringify({ events: [VALID_EVENT, event2] }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await app.fetch(req, makeEnv());
    expect(res.status).toBe(202);
    const body: BatchSuccessResponse = await res.json();
    expect(body.success).toBe(true);
    expect(body.count).toBe(1);
    expect(body.deduped).toBe(1);
  });
});

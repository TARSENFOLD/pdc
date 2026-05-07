import type { Context, Next } from 'hono';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock middleware before importing app
vi.mock('./middleware/jws-verify', () => ({
  jwsVerifyMiddleware: vi.fn(async (_c: Context, next: Next) => {
    _c.set('userId', 'user-test-123');
    _c.set('perfilId', 'perfil-test-456');
    await next();
  }),
}));

const { default: app } = await import('./index');

// An event with negative dwellTime triggers ruleNoNegativeDwellTime sanity failure
const INVALID_EVENT = {
  eventId: '660e8400-e29b-41d4-a716-446655440099',
  tipo: 'page.viewed' as const,
  timestamp: new Date().toISOString(),
  payload: { dwellTime: -999, sessionToken: 'tok-abc' },
};

const REDIS_OK = JSON.stringify([{ result: 'OK' }]);

function makeEnv(overrides: Record<string, string> = {}) {
  return {
    UPSTASH_REDIS_REST_URL: 'https://fake.upstash.io',
    UPSTASH_REDIS_REST_TOKEN: 'test-token',
    BFF_URL: 'http://bff.local',
    TELEMETRY_SECRET: 'secret',
    ...overrides,
  };
}

function isBatchResponse(value: unknown): value is { success: boolean; count: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    typeof value.success === 'boolean' &&
    'count' in value &&
    typeof value.count === 'number'
  );
}

function readFirstQueuedEvent(capturedQueueBody: string[] | undefined): Record<string, unknown> {
  const firstQueuedItem = capturedQueueBody?.[0];
  if (!firstQueuedItem) {
    throw new Error('Redis queue body was not captured');
  }

  return JSON.parse(firstQueuedItem) as Record<string, unknown>;
}

describe('Edge characterization — linha 161 (bug snapshot)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('[BUG snapshot] evento com sanidade inválida: metadata recebe payload espalhado (linha 161)', async () => {
    let capturedQueueBody: string[] | undefined;

    vi.stubGlobal(
      'fetch',
      vi.fn()
        // 1st call: Redis pipeline SET NX → OK (new event)
        .mockResolvedValueOnce(new Response(REDIS_OK, { status: 200 }))
        // 2nd call: Redis LPUSH — capture body
        .mockImplementationOnce((_url: string, init: RequestInit) => {
          capturedQueueBody = JSON.parse(init.body as string) as string[];
          return new Response(JSON.stringify({ result: 1 }), { status: 200 });
        }),
    );

    const req = new Request('http://edge/telemetria/batch', {
      method: 'POST',
      body: JSON.stringify({ events: [INVALID_EVENT] }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await app.fetch(req, makeEnv());
    expect(res.status).toBe(202);

    // Tag-don't-drop: evento foi processado, não descartado
    const body: unknown = await res.json();
    if (!isBatchResponse(body)) {
      throw new Error('Resposta de batch inesperada');
    }
    expect(body.success).toBe(true);
    expect(body.count).toBe(1);

    expect(capturedQueueBody).toBeDefined();
    const queuedEvent = readFirstQueuedEvent(capturedQueueBody);

    // Auditoria forense: flags de invalidação presentes
    const metadata = queuedEvent.metadata as Record<string, unknown>;
    expect(metadata).toBeDefined();
    expect(metadata.edgeInvalidated).toBe(true);
    expect(typeof metadata.edgeReason).toBe('string');
    expect(metadata.edgeReason as string).toContain('negativo');

    // BUG (linha 161): payload é espalhado em metadata em vez de preservado separado.
    // Este assert caracteriza o comportamento actual. A Wave 5 (T5.1) inverte este snapshot
    // ao corrigir o bug: metadata ficará limpo, sem campos do payload.
    expect(metadata.dwellTime).toBe(-999);
    expect(metadata.sessionToken).toBe('tok-abc');

    // payload original ainda presente via spread de identifiedEvent
    expect(queuedEvent.payload).toEqual({ dwellTime: -999, sessionToken: 'tok-abc' });
  });

  it('evento válido não recebe metadata de invalidação', async () => {
    const VALID_EVENT = {
      eventId: '550e8400-e29b-41d4-a716-446655440000',
      tipo: 'page.viewed' as const,
      timestamp: new Date().toISOString(),
      payload: {},
    };

    let capturedQueueBody: string[] | undefined;

    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce(new Response(REDIS_OK, { status: 200 }))
        .mockImplementationOnce((_url: string, init: RequestInit) => {
          capturedQueueBody = JSON.parse(init.body as string) as string[];
          return new Response(JSON.stringify({ result: 1 }), { status: 200 });
        }),
    );

    const req = new Request('http://edge/telemetria/batch', {
      method: 'POST',
      body: JSON.stringify({ events: [VALID_EVENT] }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await app.fetch(req, makeEnv());
    expect(res.status).toBe(202);

    expect(capturedQueueBody).toBeDefined();
    const queuedEvent = readFirstQueuedEvent(capturedQueueBody);
    // Nenhum metadata de invalidação para eventos válidos
    expect((queuedEvent.metadata as Record<string, unknown> | undefined)?.edgeInvalidated).toBeUndefined();
  });
});

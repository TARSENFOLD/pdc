import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('pino', () => ({
  default: vi.fn(() => ({
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  })),
}));

vi.mock('../../../lib/redis.js', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock('../../strapi/strapi.client.js', () => ({
  strapiPut: vi.fn(),
}));

vi.mock('../../events/event-bus.js', () => ({
  eventBus: {
    publishWithOutbox: vi.fn().mockResolvedValue({}),
  },
}));

import { redis } from '../../../lib/redis.js';
import { strapiPut } from '../../strapi/strapi.client.js';
import { eventBus } from '../../events/event-bus.js';

const publishWithOutboxMock = vi.mocked(eventBus)['publishWithOutbox'];
import {
  aggregateLabEvent,
  derivePerSession,
  finalizeSession,
  handleLabEvent,
  type SessionScore,
} from './sim-2-3.engine.js';
import type { TelemetriaEvento } from '@pdc/shared';

function makeEvent(
  overrides: Partial<TelemetriaEvento> = {},
): TelemetriaEvento {
  return {
    eventId: crypto.randomUUID(),
    tipo: 'simulacao.lab.event',
    timestamp: new Date().toISOString(),
    perfilId: 'perfil-001',
    payload: { tentativaId: 'tent-001', type: 'click' },
    sessionId: 'session-001',
    ...overrides,
  };
}

interface SessionState {
  events: TelemetriaEvento[];
  perfilId?: string;
}

describe('aggregateLabEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(redis.get).mockResolvedValue(null);
    vi.mocked(redis.set).mockResolvedValue('OK');
  });

  it('cria novo estado Redis quando não existe entrada prévia', async () => {
    const event = makeEvent();
    await aggregateLabEvent('tent-001', 'session-001', event);

    expect(redis.get).toHaveBeenCalledWith('sim:session:tent-001:session-001');
    expect(redis.set).toHaveBeenCalledWith(
      'sim:session:tent-001:session-001',
      expect.objectContaining({ events: expect.any(Array) as unknown[] }),
      expect.objectContaining({ ex: expect.any(Number) as number }),
    );
  });

  it('adiciona evento a estado Redis existente', async () => {
    const firstEvent = makeEvent({ eventId: 'evt-first' });
    const existingState: SessionState = { events: [firstEvent], perfilId: 'perfil-001' };
    vi.mocked(redis.get).mockResolvedValue(existingState);

    const newEvent = makeEvent({ eventId: 'evt-second' });
    await aggregateLabEvent('tent-001', 'session-001', newEvent);

    const setCall = vi.mocked(redis.set).mock.calls[0];
    const savedState = setCall?.[1] as SessionState;
    expect(savedState.events).toHaveLength(2);
  });
});

describe('derivePerSession', () => {
  it('retorna score zero para array vazio', () => {
    const result = derivePerSession([]);
    expect(result.score).toBe(0);
    expect(result.fluidez).toBe(0);
    expect(result.resiliencia).toBe(0);
    expect(result.foco).toBe(0);
  });

  it('retorna score numérico válido (0-100) para eventos reais', () => {
    const now = Date.now();
    const events: TelemetriaEvento[] = Array.from({ length: 5 }, (_, i) => ({
      eventId: crypto.randomUUID(),
      tipo: 'simulacao.lab.event' as const,
      timestamp: new Date(now + i * 800).toISOString(),
      perfilId: 'perfil-001',
      payload: { tentativaId: 'tent-001', type: 'click' },
      sessionId: 'session-001',
    }));

    const result: SessionScore = derivePerSession(events);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(typeof result.fluidez).toBe('number');
    expect(typeof result.resiliencia).toBe('number');
    expect(typeof result.foco).toBe('number');
    expect(result.areaScore).toHaveProperty('fluidez');
    expect(result.areaScore).toHaveProperty('resiliencia');
    expect(result.areaScore).toHaveProperty('foco');
  });

  it('produz score mais alto para eventos rápidos e contínuos (alta fluidez)', () => {
    const now = Date.now();
    const fastEvents: TelemetriaEvento[] = Array.from({ length: 8 }, (_, i) => ({
      eventId: crypto.randomUUID(),
      tipo: 'simulacao.lab.event' as const,
      timestamp: new Date(now + i * 600).toISOString(),
      perfilId: 'perfil-001',
      payload: { tentativaId: 'tent-001', type: 'click' },
      sessionId: 'session-001',
    }));
    const slowEvents: TelemetriaEvento[] = Array.from({ length: 8 }, (_, i) => ({
      eventId: crypto.randomUUID(),
      tipo: 'simulacao.lab.event' as const,
      timestamp: new Date(now + i * 8000).toISOString(),
      perfilId: 'perfil-001',
      payload: { tentativaId: 'tent-001', type: 'click' },
      sessionId: 'session-001',
    }));

    const fastScore = derivePerSession(fastEvents);
    const slowScore = derivePerSession(slowEvents);
    expect(fastScore.score).toBeGreaterThan(slowScore.score);
  });
});

describe('finalizeSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(redis.set).mockResolvedValue('OK');
    vi.mocked(redis.get).mockResolvedValue(null);
    vi.mocked(strapiPut).mockResolvedValue({ data: { id: 1 }, meta: {} });
    publishWithOutboxMock.mockResolvedValue({} as ReturnType<typeof eventBus.publishWithOutbox> extends Promise<infer T> ? T : never);
  });

  it('chama strapiPut com score derivado após finalização', async () => {
    const now = Date.now();
    const events: TelemetriaEvento[] = Array.from({ length: 4 }, (_, i) => ({
      eventId: crypto.randomUUID(),
      tipo: 'simulacao.lab.event' as const,
      timestamp: new Date(now + i * 700).toISOString(),
      perfilId: 'perfil-001',
      payload: { tentativaId: 'tent-001', type: 'click' },
      sessionId: 'session-001',
    }));
    const state: SessionState = { events, perfilId: 'perfil-001' };
    vi.mocked(redis.get).mockResolvedValue(state);

    await finalizeSession('tent-001', 'session-001');

    expect(strapiPut).toHaveBeenCalledWith(
      '/tentativas/tent-001',
      expect.objectContaining({
        score: expect.any(Number) as number,
        status: 'concluida',
        dataFim: expect.any(String) as string,
      }),
    );
  });

  it('emite TENTATIVA_CONCLUIDA após persistir score', async () => {
    const events: TelemetriaEvento[] = [makeEvent()];
    vi.mocked(redis.get).mockResolvedValue({ events, perfilId: 'perfil-001' } as SessionState);

    await finalizeSession('tent-001', 'session-001');
    await vi.waitFor(() => {
      expect(publishWithOutboxMock).toHaveBeenCalled();
    });

    expect(publishWithOutboxMock).toHaveBeenCalledWith(
      'tentativa.concluida',
      expect.objectContaining({ tentativaId: 'tent-001', area: 'simulacao' }),
    );
  });

  it('garante idempotência: segunda finalização é ignorada', async () => {
    // NX returns null → key already exists → skip finalization
    vi.mocked(redis.set).mockResolvedValue(null);

    await finalizeSession('tent-001', 'session-001');

    expect(strapiPut).not.toHaveBeenCalled();
    expect(publishWithOutboxMock).not.toHaveBeenCalled();
  });

  it('timeout automático: finalizeSession sem session.ended prévio (chamada directa por worker)', async () => {
    // Simulates a heuristic timeout worker calling finalizeSession directly
    const events: TelemetriaEvento[] = [makeEvent(), makeEvent({ eventId: 'evt-2' })];
    vi.mocked(redis.get).mockResolvedValue({ events, perfilId: 'perfil-001' } as SessionState);

    await finalizeSession('tent-001', 'session-timeout');

    expect(strapiPut).toHaveBeenCalledWith(
      '/tentativas/tent-001',
      expect.objectContaining({ status: 'concluida' }),
    );
  });
});

describe('handleLabEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(redis.get).mockResolvedValue(null);
    vi.mocked(redis.set).mockResolvedValue('OK');
    vi.mocked(strapiPut).mockResolvedValue({ data: { id: 1 }, meta: {} });
    publishWithOutboxMock.mockResolvedValue({} as ReturnType<typeof eventBus.publishWithOutbox> extends Promise<infer T> ? T : never);
  });

  it('ignora evento sem tentativaId no payload', async () => {
    const event = makeEvent({ payload: {}, sessionId: 'session-001' });
    await handleLabEvent(event);
    expect(redis.set).not.toHaveBeenCalled();
  });

  it('ignora evento sem sessionId', async () => {
    const event = makeEvent({ sessionId: undefined });
    await handleLabEvent(event);
    expect(redis.set).not.toHaveBeenCalled();
  });

  it('agrega evento simulacao.lab.event ao buffer Redis', async () => {
    const event = makeEvent({ tipo: 'simulacao.lab.event' });
    await handleLabEvent(event);
    expect(redis.set).toHaveBeenCalled();
    expect(strapiPut).not.toHaveBeenCalled();
  });

  it('agrega e finaliza sessão quando simulacao.lab.session.ended é recebido', async () => {
    const events: TelemetriaEvento[] = [makeEvent()];
    vi.mocked(redis.get).mockResolvedValue({ events, perfilId: 'perfil-001' } as SessionState);

    const endEvent = makeEvent({ tipo: 'simulacao.lab.session.ended' });
    await handleLabEvent(endEvent);

    expect(strapiPut).toHaveBeenCalledWith(
      '/tentativas/tent-001',
      expect.objectContaining({ status: 'concluida' }),
    );
  });
});

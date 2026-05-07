import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eventBus } from './event-bus.js';
import { DomainEventName, type DomainEvent } from '@pdc/shared';

vi.mock('../strapi/strapi.client.js', () => ({
  strapiPost: vi.fn().mockResolvedValue({ data: { id: 1 }, meta: {} }),
  strapiPut: vi.fn().mockResolvedValue({ data: { id: 1 }, meta: {} }),
  strapiGet: vi.fn().mockResolvedValue({ data: [], meta: {} }),
}));

vi.mock('../../lib/redis.js', () => ({
  redis: {
    sadd: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    del: vi.fn().mockResolvedValue(1),
  },
}));

// Canonical valid payloads for each event name under test
const CANONICAL_EVENTS: Array<{ name: DomainEventName; payload: Record<string, unknown> }> = [
  {
    name: DomainEventName.CURSO_PUBLICADO,
    payload: {
      autorId: 'autor-replay-1',
      titulo: 'Curso de Replay',
      area: 'Tecnologia',
      cursoId: 'curso-replay-1',
    },
  },
  {
    name: DomainEventName.CONQUISTA_DESBLOQUEADA,
    payload: {
      conquistaId: 'conquista-replay-1',
      userId: 'user-replay-1',
      tipo: 'automatica',
      titulo: 'Primeira Conquista',
      aprovada: true,
    },
  },
  {
    name: DomainEventName.POST_PUBLICADO,
    payload: {
      autorId: 'autor-replay-1',
      titulo: 'Post de Replay',
      area: 'Tecnologia',
      postId: 'post-replay-1',
    },
  },
];

describe('Replay Compatibility — eventos canónicos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eventBus.removeAllListeners();
  });

  it.each(CANONICAL_EVENTS)(
    'replay do evento "$name" não rejeita o contrato Zod nem lança erro',
    async ({ name, payload }) => {
      const event: DomainEvent = {
        id: crypto.randomUUID(),
        name,
        payload,
        timestamp: new Date().toISOString(),
        correlationId: crypto.randomUUID(),
      };

      await expect(eventBus.publish(event)).resolves.toBeUndefined();
    },
  );

  it('payload inválido de CURSO_PUBLICADO (campo obrigatório ausente) rejeita no replay', async () => {
    const event: DomainEvent = {
      id: crypto.randomUUID(),
      name: DomainEventName.CURSO_PUBLICADO,
      // autorId ausente — violação de contrato
      payload: { titulo: 'Sem Autor', cursoId: 'curso-bad' },
      timestamp: new Date().toISOString(),
      correlationId: crypto.randomUUID(),
    };

    await expect(eventBus.publish(event)).rejects.toThrow(/contrato E2E/);
  });

  it('payload inválido de CONQUISTA_DESBLOQUEADA (tipo inválido) rejeita no replay', async () => {
    const event: DomainEvent = {
      id: crypto.randomUUID(),
      name: DomainEventName.CONQUISTA_DESBLOQUEADA,
      payload: {
        conquistaId: 'c-1',
        userId: 'u-1',
        tipo: 'desconhecido', // não está no enum
        titulo: 'Conquista',
        aprovada: true,
      },
      timestamp: new Date().toISOString(),
      correlationId: crypto.randomUUID(),
    };

    await expect(eventBus.publish(event)).rejects.toThrow(/contrato E2E/);
  });

  it('payload de CONQUISTA_DESBLOQUEADA aceita campos transitórios opcionais (perfilId, conquistaSlug)', async () => {
    const event: DomainEvent = {
      id: crypto.randomUUID(),
      name: DomainEventName.CONQUISTA_DESBLOQUEADA,
      payload: {
        conquistaId: 'c-legacy-1',
        userId: 'u-legacy-1',
        tipo: 'automatica',
        titulo: 'Conquista Legada',
        aprovada: false,
        perfilId: 'perfil-transitório',
        conquistaSlug: 'slug-transitório',
      },
      timestamp: new Date().toISOString(),
      correlationId: crypto.randomUUID(),
    };

    // Transitional fields must not break replay until W6 removes them
    await expect(eventBus.publish(event)).resolves.toBeUndefined();
  });
});

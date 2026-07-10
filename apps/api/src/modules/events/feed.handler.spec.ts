import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DomainEventName, type DomainEvent, type StrapiListResponse } from '@pdc/shared';
import { strapiGet, strapiPost } from '../strapi/strapi.client.js';

type LegacyFeedHandlerModule = {
  feedHandler: (event: DomainEvent) => Promise<void>;
};

async function runLegacyFeedHandler(event: DomainEvent): Promise<void> {
  const feedHandlerModule = (await import('./feed.handler.js')) as unknown as LegacyFeedHandlerModule;
  await feedHandlerModule.feedHandler(event);
}

vi.mock('../strapi/strapi.client.js', () => ({
  strapiGet: vi.fn(),
  strapiPost: vi.fn().mockResolvedValue({ data: { id: 'feed-entry-1' }, meta: {} }),
}));

function listResponse<T>(data: Array<T & { id: string | number }>): StrapiListResponse<T> {
  return {
    data,
    meta: { pagination: { page: 1, pageSize: data.length, pageCount: 1, total: data.length } },
  };
}

describe('feedHandler legado', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(strapiGet).mockResolvedValue(listResponse([]));
    vi.mocked(strapiPost).mockResolvedValue({ data: { id: 'feed-entry-1' }, meta: {} });
  });

  it('grava feed-entry canónico em vez de criar post automático legado', async () => {
    const event: DomainEvent = {
      id: 'event-feed-1',
      name: DomainEventName.CURSO_PUBLICADO,
      payload: {
        cursoId: 'curso-1',
        autorId: 'autor-1',
        titulo: 'Curso Canónico',
        area: 'TECNOLOGIA',
      },
      timestamp: '2026-07-05T12:00:00.000Z',
      correlationId: 'event-feed-1',
    };

    await runLegacyFeedHandler(event);

    expect(strapiPost).not.toHaveBeenCalledWith('/posts', expect.any(Object));
    expect(strapiPost).toHaveBeenCalledWith('/feed-entries', expect.objectContaining({
      entityType: 'curso',
      entityId: 'curso-1',
      autorId: 'autor-1',
      source: 'vocacional',
      eventId: 'event-feed-1',
    }));
  });

  it('não duplica feed-entry quando replay encontra eventId existente', async () => {
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([{ id: 'feed-entry-existing' }]));
    const event: DomainEvent = {
      id: 'event-feed-replay',
      name: DomainEventName.CURSO_PUBLICADO,
      payload: {
        cursoId: 'curso-1',
        autorId: 'autor-1',
        titulo: 'Curso Canónico',
        area: 'TECNOLOGIA',
      },
      timestamp: '2026-07-05T12:00:00.000Z',
      correlationId: 'event-feed-replay',
    };

    await runLegacyFeedHandler(event);

    expect(strapiGet).toHaveBeenCalledWith('/feed-entries', {
      'filters[eventId][$eq]': 'event-feed-replay',
      'pagination[pageSize]': '1',
    });
    expect(strapiPost).not.toHaveBeenCalled();
  });
});
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DomainEventName, EcosystemHookName, type EcosystemHookContext, type StrapiListResponse } from '@pdc/shared';
import { matchHook } from './match.hook.js';
import { strapiGet, strapiPost } from '../strapi/strapi.client.js';

vi.mock('../strapi/strapi.client.js', () => ({
  strapiGet: vi.fn(),
  strapiPost: vi.fn().mockResolvedValue({ data: { id: 'match-1' }, meta: {} }),
}));

function listResponse<T>(data: Array<T & { id: string | number }>): StrapiListResponse<T> {
  return {
    data,
    meta: { pagination: { page: 1, pageSize: data.length, pageCount: 1, total: data.length } },
  };
}

describe('matchHook', () => {
  const context: EcosystemHookContext = {
    results: {
      [EcosystemHookName.RANKING]: { status: 'skipped' },
      [EcosystemHookName.FEED]: { status: 'skipped' },
      [EcosystemHookName.MATCH]: { status: 'skipped' },
      [EcosystemHookName.ACHIEVEMENT]: { status: 'skipped' },
      [EcosystemHookName.NOTIFY]: { status: 'skipped' },
      [EcosystemHookName.BEHAVIOR]: { status: 'skipped' },
    },
  };

  beforeEach(() => {
    vi.mocked(strapiGet).mockReset();
    vi.mocked(strapiPost).mockReset();
    vi.mocked(strapiPost).mockResolvedValue({ data: { id: 'match-1' }, meta: {} });
  });

  it('cria sugestão para estudante compatível e dedupe por eventId+estudante', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([{ id: 'autor-1', reputacao: 65 }]))
      .mockResolvedValueOnce(listResponse([{ id: 'est-1', reputacao: 50, areasInteresse: ['TECNOLOGIA'] }]))
      .mockResolvedValueOnce(listResponse([])) // behavior-patterns
      .mockResolvedValueOnce(listResponse([])); // /match-suggestions existence check

    const result = await matchHook.execute({
      id: 'event-match-1',
      name: DomainEventName.CURSO_PUBLICADO,
      payload: {
        autorId: 'autor-1',
        cursoId: 'curso-1',
        area: 'TECNOLOGIA',
      },
      timestamp: '2026-07-05T12:00:00.000Z',
      correlationId: 'event-match-1',
    }, context);

    expect(result.status).toBe('sent');
    expect(strapiGet).toHaveBeenCalledWith('/match-suggestions', {
      'filters[eventId][$eq]': 'event-match-1',
      'filters[estudante][id][$eq]': 'est-1',
      'pagination[pageSize]': '1',
    });
    expect(strapiPost).toHaveBeenCalledWith('/match-suggestions', expect.objectContaining({
      estudante: 'est-1',
      entityType: 'curso',
      entityId: 'curso-1',
      eventId: 'event-match-1',
    }));
  });

  it('não duplica sugestão já existente para o mesmo evento e estudante', async () => {
    vi.mocked(strapiGet).mockImplementation((path: string, params?: Record<string, string | string[]>) => {
      if (path === '/match-suggestions') return Promise.resolve(listResponse([{ id: 'match-existing' }]));
      if (path === '/perfis' && params?.['filters[id][$eq]'] === 'autor-1') {
        return Promise.resolve(listResponse([{ id: 'autor-1', reputacao: 65 }]));
      }
      if (path === '/perfis') {
        return Promise.resolve(listResponse([{ id: 'est-1', reputacao: 50, areasInteresse: ['TECNOLOGIA'] }]));
      }
      return Promise.resolve(listResponse([]));
    });

    const result = await matchHook.execute({
      id: 'event-match-1',
      name: DomainEventName.CURSO_PUBLICADO,
      payload: {
        autorId: 'autor-1',
        cursoId: 'curso-1',
        area: 'TECNOLOGIA',
      },
      timestamp: '2026-07-05T12:00:00.000Z',
      correlationId: 'event-match-1',
    }, context);

    expect(result.status).toBe('sent');
    expect(strapiPost).not.toHaveBeenCalled();
  });

  it('bloqueia recomendações premium quando regrasAcesso exigem DNA e estudante não tem histórico', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([{ id: 'autor-1', reputacao: 90 }]))
      .mockResolvedValueOnce(listResponse([{ id: 'est-1', reputacao: 95, areasInteresse: ['TECNOLOGIA'] }]))
      .mockResolvedValueOnce(listResponse([]));

    const result = await matchHook.execute({
      id: 'event-match-premium',
      name: DomainEventName.CURSO_PUBLICADO,
      payload: {
        autorId: 'autor-1',
        cursoId: 'curso-premium',
        area: 'TECNOLOGIA',
        regrasAcesso: { minFluidez: 7 },
      },
      timestamp: '2026-07-05T12:00:00.000Z',
      correlationId: 'event-match-premium',
    }, context);

    expect(result.status).toBe('sent');
    expect(strapiPost).not.toHaveBeenCalled();
  });
});
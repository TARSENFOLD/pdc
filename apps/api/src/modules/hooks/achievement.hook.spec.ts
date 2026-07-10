import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DomainEventName, EcosystemHookName } from '@pdc/shared';
import type { EcosystemHookContext, StrapiListResponse } from '@pdc/shared';
import { achievementHook } from './achievement.hook.js';
import { conquistaEngine } from '../conquistas/conquistas.engine.js';
import { strapiGet } from '../strapi/strapi.client.js';

vi.mock('../strapi/strapi.client.js', () => ({
  strapiGet: vi.fn(),
}));

vi.mock('../conquistas/conquistas.engine.js', () => ({
  conquistaEngine: {
    verificarConquistas: vi.fn().mockResolvedValue([]),
  },
}));

function listResponse<T extends { id: string | number }>(data: T[]): StrapiListResponse<T> {
  return {
    data,
    meta: { pagination: { page: 1, pageSize: data.length, pageCount: 1, total: data.length } },
  };
}

describe('achievementHook', () => {
  const hookContext: EcosystemHookContext = {
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
    vi.clearAllMocks();
  });

  it('LIKE_ADICIONADO avalia conquistas para o dono do target, não para o actor do like', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([{
        id: 'post-1',
        documentId: 'post-doc-1',
        autor: { id: 'perfil-owner', userId: 'owner-user' },
      }]))
      .mockResolvedValueOnce(listResponse([{ id: 'perfil-owner', userId: 'owner-user' }]));

    const result = await achievementHook.execute({
      id: 'event-like-1',
      name: DomainEventName.LIKE_ADICIONADO,
      payload: { autorId: 'perfil-liker', targetType: 'post', targetId: 'post-doc-1' },
      timestamp: '2026-07-05T00:00:00.000Z',
      correlationId: 'event-like-1',
    }, hookContext);

    expect(result.status).toBe('skipped');
    expect(strapiGet).toHaveBeenNthCalledWith(1, '/feed-posts', expect.objectContaining({
      'filters[$or][0][id][$eq]': 'post-doc-1',
      'filters[$or][1][documentId][$eq]': 'post-doc-1',
      populate: 'autor',
    }));
    expect(strapiGet).toHaveBeenNthCalledWith(2, '/perfis', expect.objectContaining({
      'filters[id][$eq]': 'perfil-owner',
    }));
    expect(conquistaEngine.verificarConquistas).toHaveBeenCalledWith(
      'owner-user',
      DomainEventName.LIKE_ADICIONADO,
      undefined,
    );
  });

  it('LIKE_ADICIONADO sem dono resolvido não cai no autorId do liker', async () => {
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([]));

    const result = await achievementHook.execute({
      id: 'event-like-missing-owner',
      name: DomainEventName.LIKE_ADICIONADO,
      payload: { autorId: 'perfil-liker', targetType: 'post', targetId: 'post-doc-missing' },
      timestamp: '2026-07-05T00:00:00.000Z',
      correlationId: 'event-like-missing-owner',
    }, hookContext);

    expect(result).toEqual({ status: 'skipped', reason: 'perfilId-missing' });
    expect(strapiGet).toHaveBeenCalledOnce();
    expect(conquistaEngine.verificarConquistas).not.toHaveBeenCalled();
  });
});
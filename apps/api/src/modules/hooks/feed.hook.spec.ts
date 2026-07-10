import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DomainEventName, EcosystemHookName, type EcosystemHookContext } from '@pdc/shared';
import { feedHook } from './feed.hook.js';
import { strapiPost } from '../strapi/strapi.client.js';
import { redis } from '../../lib/redis.js';

vi.mock('../strapi/strapi.client.js', () => ({
  strapiPost: vi.fn().mockResolvedValue({ data: { id: 'entry-1' }, meta: {} }),
}));

vi.mock('../../lib/redis.js', () => ({
  redis: {
    del: vi.fn().mockResolvedValue(1),
  },
}));

describe('feedHook', () => {
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
    vi.clearAllMocks();
  });

  it.each([
    [DomainEventName.CURSO_PUBLICADO, 'cursoId', 'curso', 'curso-1'],
    [DomainEventName.SIMULACAO_PUBLICADA, 'simulacaoId', 'simulacao', 'sim-1'],
    [DomainEventName.EXPERIENCIA_PUBLICADA, 'experienciaId', 'experiencia', 'exp-1'],
    [DomainEventName.PROGRAMA_PUBLICADO, 'programaId', 'programa', 'prog-1'],
    [DomainEventName.PROJETO_PUBLICADO, 'projetoId', 'projeto', 'proj-1'],
    [DomainEventName.POST_PUBLICADO, 'postId', 'post', 'post-1'],
  ] as const)('propaga %s para feed-entry %s', async (eventName, idField, entityType, entityId) => {
    const result = await feedHook.execute({
      id: `event-${entityType}-1`,
      name: eventName,
      payload: {
        [idField]: entityId,
        autorId: 'perfil-1',
        titulo: `Título ${entityType}`,
        area: 'TECNOLOGIA',
      },
      timestamp: '2026-07-05T12:00:00.000Z',
      correlationId: `event-${entityType}-1`,
    }, context);

    expect(result.status).toBe('sent');
    expect(strapiPost).toHaveBeenCalledWith('/feed-entries', expect.objectContaining({
      entityType,
      entityId,
      autorId: 'perfil-1',
      eventId: `event-${entityType}-1`,
    }));
  });

  it('normaliza post.published para entityType post e invalida caches de feed', async () => {
    const result = await feedHook.execute({
      id: 'event-post-1',
      name: DomainEventName.POST_PUBLICADO,
      payload: {
        postId: 'post-1',
        autorId: 'perfil-1',
        titulo: 'Post aprovado',
        area: 'TECNOLOGIA',
      },
      timestamp: '2026-07-05T12:00:00.000Z',
      correlationId: 'event-post-1',
    }, context);

    expect(result.status).toBe('sent');
    expect(strapiPost).toHaveBeenCalledWith('/feed-entries', expect.objectContaining({
      entityType: 'post',
      entityId: 'post-1',
      eventId: 'event-post-1',
    }));
    expect(redis.del).toHaveBeenCalledWith('feed:vocacional:TECNOLOGIA');
    expect(redis.del).toHaveBeenCalledWith('feed:trending:all');
  });

  it('propaga source institucional e invalida cache por instituição', async () => {
    const result = await feedHook.execute({
      id: 'event-exp-1',
      name: DomainEventName.EXPERIENCIA_PUBLICADA,
      payload: {
        experienciaId: 'exp-1',
        autorId: 'perfil-inst',
        instituicaoId: 'inst-1',
        titulo: 'Open day',
        area: 'ENGENHARIA',
      },
      timestamp: '2026-07-05T12:00:00.000Z',
      correlationId: 'event-exp-1',
    }, context);

    expect(result.status).toBe('sent');
    expect(strapiPost).toHaveBeenCalledWith('/feed-entries', expect.objectContaining({
      entityType: 'experiencia',
      entityId: 'exp-1',
      source: 'institucional',
      instituicaoId: 'inst-1',
    }));
    expect(redis.del).toHaveBeenCalledWith('feed:institucional:inst-1');
    expect(redis.del).toHaveBeenCalledWith('feed:trending:all');
  });

  it('skips non-publish events', async () => {
    const result = await feedHook.execute({
      id: 'event-login-1',
      name: DomainEventName.LOGIN,
      payload: { userId: 'user-1' },
      timestamp: '2026-07-05T12:00:00.000Z',
      correlationId: 'event-login-1',
    }, context);

    expect(result.status).toBe('skipped');
    expect(strapiPost).not.toHaveBeenCalled();
  });

  it('returns fatal_error when entityId is missing', async () => {
    const result = await feedHook.execute({
      id: 'event-curso-1',
      name: DomainEventName.CURSO_PUBLICADO,
      payload: { autorId: 'perfil-1', titulo: 'Sem id' },
      timestamp: '2026-07-05T12:00:00.000Z',
      correlationId: 'event-curso-1',
    }, context);

    expect(result.status).toBe('fatal_error');
    expect(strapiPost).not.toHaveBeenCalled();
  });

  it('returns fatal_error and does not persist orphan feed entry when autorId is missing', async () => {
    const result = await feedHook.execute({
      id: 'event-curso-sem-autor',
      name: DomainEventName.CURSO_PUBLICADO,
      payload: { cursoId: 'curso-1', titulo: 'Sem autor' },
      timestamp: '2026-07-05T12:00:00.000Z',
      correlationId: 'event-curso-sem-autor',
    }, context);

    expect(result).toEqual({ status: 'fatal_error', reason: 'autorId-missing' });
    expect(strapiPost).not.toHaveBeenCalled();
  });
});
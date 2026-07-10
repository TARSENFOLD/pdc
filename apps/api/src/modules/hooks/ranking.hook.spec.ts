import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DomainEventName, EcosystemHookName, type EcosystemHookContext } from '@pdc/shared';
import { rankingHook } from './ranking.hook.js';
import * as reputationService from '../reputation/reputation.service.js';

vi.mock('../reputation/reputation.service.js', () => ({
  marcarParaRecalculo: vi.fn().mockResolvedValue(undefined),
}));

describe('rankingHook', () => {
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

  it('marca autor para recálculo quando curso é publicado', async () => {
    const result = await rankingHook.execute({
      id: 'evt-curso-1',
      name: DomainEventName.CURSO_PUBLICADO,
      payload: {
        cursoId: 'curso-1',
        autorId: 'perfil-mentor-1',
        titulo: 'Curso de Medicina',
        area: 'SAUDE',
      },
      timestamp: '2026-07-05T12:00:00.000Z',
      correlationId: 'evt-curso-1',
    }, context);

    expect(result).toEqual({ status: 'sent' });
    expect(reputationService.marcarParaRecalculo).toHaveBeenCalledWith('perfil-mentor-1', DomainEventName.CURSO_PUBLICADO);
  });

  it('marca perfil para recálculo quando tentativa é concluída', async () => {
    const result = await rankingHook.execute({
      id: 'evt-tentativa-1',
      name: DomainEventName.TENTATIVA_CONCLUIDA,
      payload: {
        tentativaId: 'tent-1',
        perfilId: 'perfil-estudante-1',
        score: 87,
        area: 'TECNOLOGIA',
      },
      timestamp: '2026-07-05T12:00:00.000Z',
      correlationId: 'evt-tentativa-1',
    }, context);

    expect(result).toEqual({ status: 'sent' });
    expect(reputationService.marcarParaRecalculo).toHaveBeenCalledWith('perfil-estudante-1', DomainEventName.TENTATIVA_CONCLUIDA);
  });

  it('ignora evento sem mérito direto', async () => {
    const result = await rankingHook.execute({
      id: 'evt-login-1',
      name: DomainEventName.LOGIN,
      payload: { userId: 'user-1' },
      timestamp: '2026-07-05T12:00:00.000Z',
      correlationId: 'evt-login-1',
    }, context);

    expect(result).toEqual({ status: 'skipped', reason: 'not-a-merit-event' });
    expect(reputationService.marcarParaRecalculo).not.toHaveBeenCalled();
  });

  it('inclui rating criado como sinal de ranking/reputação', async () => {
    const result = await rankingHook.execute({
      id: 'evt-rating-1',
      name: DomainEventName.RATING_CRIADO,
      payload: {
        autorId: 'perfil-avaliador-1',
        targetType: 'curso',
        targetId: 'curso-1',
        score: 5,
      },
      timestamp: '2026-07-05T12:00:00.000Z',
      correlationId: 'evt-rating-1',
    }, context);

    expect(result).toEqual({ status: 'sent' });
    expect(reputationService.marcarParaRecalculo).toHaveBeenCalledWith('perfil-avaliador-1', DomainEventName.RATING_CRIADO);
  });
});
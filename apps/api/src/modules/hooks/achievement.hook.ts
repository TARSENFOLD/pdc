import { 
  type EcosystemHook, 
  EcosystemHookName, 
  type DomainEvent, 
  type EcosystemHookResult,
  type BaseDomainEventPayload
} from '@pdc/shared';
import { conquistaEngine } from '../conquistas/conquistas.engine.js';
import { strapiGet } from '../strapi/strapi.client.js';
import pino from 'pino';

const log = pino({ name: 'achievement-hook' });

export const achievementHook: EcosystemHook = {
  name: EcosystemHookName.ACHIEVEMENT,
  dependencies: [],
  
  idempotencyKey: (event) => `achievement:${event.id}`,

  execute: async (event: DomainEvent<BaseDomainEventPayload>): Promise<EcosystemHookResult> => {
    const payload = event.payload;
    const perfilId = payload.perfilId || payload.autorId || payload.userId;

    if (!perfilId) {
      return { status: 'skipped', reason: 'perfilId-missing' };
    }

    try {
      // 1. Procurar userId
      const resPerfil = await strapiGet<{ userId: string }>('/perfis', {
        'filters[id][$eq]': String(perfilId),
        'fields[0]': 'userId',
      });
      const userId = resPerfil.data[0]?.userId;
      if (!userId) return { status: 'skipped', reason: 'userId-not-found' };

      // 2. Avaliar regras (Motor já é idempotente via base de dados)
      const desbloqueadas = await conquistaEngine.verificarConquistas(
        userId,
        event.name,
        payload.tentativaId
      );

      if (desbloqueadas.length === 0) {
        return { status: 'skipped', reason: 'no-achievements-unlocked' };
      }

      return { 
        status: 'sent', 
        data: { desbloqueadas, userId } 
      };
    } catch (err) {
      log.error({ err, eventId: event.id }, 'Falha no hook de conquistas');
      return { status: 'retryable_error', reason: 'achievement-engine-failed' };
    }
  }
};

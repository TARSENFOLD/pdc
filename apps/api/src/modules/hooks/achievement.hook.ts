import { 
  type EcosystemHook, 
  EcosystemHookName, 
  DomainEventName,
  type DomainEvent, 
  type EcosystemHookResult,
  type BaseDomainEventPayload
} from '@pdc/shared';
import { conquistaEngine } from '../conquistas/conquistas.engine.js';
import { strapiGet } from '../strapi/strapi.client.js';
import pino from 'pino';

const log = pino({ name: 'achievement-hook' });

interface AuthoredTargetRecord {
  id: string | number;
  documentId?: string;
  autor?: { id?: string | number; userId?: string } | null;
}

const TARGET_COLLECTIONS: Readonly<Record<string, string>> = {
  curso: '/cursos',
  simulacao: '/simulacoes',
  experiencia: '/experiencias',
  projeto: '/projetos',
  post: '/feed-posts',
};

function payloadValue(payload: BaseDomainEventPayload, key: string): string | undefined {
  const value = payload[key];
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return undefined;
}

async function resolveTargetOwnerPerfilId(payload: BaseDomainEventPayload): Promise<string | undefined> {
  const targetType = payloadValue(payload, 'targetType');
  const targetId = payloadValue(payload, 'targetId');
  if (!targetType || !targetId) return undefined;

  const collection = TARGET_COLLECTIONS[targetType];
  if (!collection) {
    log.warn({ targetType }, 'achievement.hook: targetType desconhecido para LIKE_ADICIONADO');
    return undefined;
  }

  const res = await strapiGet<AuthoredTargetRecord>(collection, {
    'filters[$or][0][id][$eq]': targetId,
    'filters[$or][1][documentId][$eq]': targetId,
    'populate': 'autor',
    'pagination[pageSize]': '1',
  });
  const autorId = res.data[0]?.autor?.id;
  return autorId === undefined ? undefined : String(autorId);
}

async function resolveAchievementPerfilId(event: DomainEvent<BaseDomainEventPayload>): Promise<string | undefined> {
  if (event.name === DomainEventName.LIKE_ADICIONADO) {
    return resolveTargetOwnerPerfilId(event.payload);
  }

  return payloadValue(event.payload, 'perfilId')
    ?? payloadValue(event.payload, 'autorId')
    ?? payloadValue(event.payload, 'userId');
}

export const achievementHook: EcosystemHook = {
  name: EcosystemHookName.ACHIEVEMENT,
  dependencies: [],
  
  idempotencyKey: (event) => `achievement:${event.id}`,

  execute: async (event: DomainEvent<BaseDomainEventPayload>): Promise<EcosystemHookResult> => {
    const payload = event.payload;
    const perfilId = await resolveAchievementPerfilId(event);

    if (!perfilId) {
      return { status: 'skipped', reason: 'perfilId-missing' };
    }

    try {
      // 1. Procurar userId
      const resPerfil = await strapiGet<{ userId: string }>('/perfis', {
        'filters[id][$eq]': perfilId,
        'fields[0]': 'userId',
      });
      const userId = resPerfil.data[0]?.userId;
      if (!userId) return { status: 'skipped', reason: 'userId-not-found' };

      // 2. Avaliar regras (Motor já é idempotente via base de dados)
      const desbloqueadas = await conquistaEngine.verificarConquistas(
        userId,
        event.name,
        payload.tentativaId ? String(payload.tentativaId) : undefined
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

import pino from 'pino';
import { strapiGet } from '../strapi/strapi.client.js';
import { redis } from '../../lib/redis.js';
import {
  SubscriptionEntitlementsSchema,
  DEFAULT_ENTITLEMENTS,
  type SubscriptionEntitlements,
} from '@pdc/shared';

const log = pino({ name: 'entitlements-service' });

const CACHE_TTL_S = 300;
const CACHE_PREFIX = 'entitlements:';

interface StrapiSubscricao {
  ativa: boolean;
  tier?: string;
  features?: unknown;
  quotas?: unknown;
}

function cacheKey(instituicaoId: string): string {
  return `${CACHE_PREFIX}${instituicaoId}`;
}

export async function getEntitlements(instituicaoId: string): Promise<SubscriptionEntitlements> {
  const key = cacheKey(instituicaoId);

  try {
    const cached = await redis.get<string>(key);
    if (cached) {
      const parsed = SubscriptionEntitlementsSchema.safeParse(JSON.parse(cached));
      if (parsed.success) return parsed.data;
    }
  } catch (err) {
    log.warn({ err, instituicaoId }, 'Cache miss para entitlements — a consultar Strapi');
  }

  let entitlements: SubscriptionEntitlements;

  try {
    const res = await strapiGet<StrapiSubscricao>('/subscricoes', {
      'filters[instituicao][documentId][$eq]': instituicaoId,
      'filters[ativa][$eq]': 'true',
      'sort': 'createdAt:desc',
      'pagination[limit]': '1',
    });

    const subscricao = res.data[0];

    if (!subscricao) {
      log.debug({ instituicaoId }, 'Sem subscrição activa — entitlements padrão (free)');
      entitlements = DEFAULT_ENTITLEMENTS;
    } else {
      const parsed = SubscriptionEntitlementsSchema.safeParse({
        tier: subscricao.tier ?? 'free',
        features: subscricao.features ?? [],
        quotas: subscricao.quotas ?? [],
      });

      if (!parsed.success) {
        log.warn({ err: parsed.error, instituicaoId }, 'Schema inválido nos entitlements do Strapi — usando defaults');
        entitlements = DEFAULT_ENTITLEMENTS;
      } else {
        entitlements = parsed.data;
      }
    }
  } catch (err) {
    log.error({ err, instituicaoId }, 'Falha ao consultar Strapi para entitlements — fail-closed (deny)');
    throw new Error('Entitlements service unavailable — access denied (fail-closed)');
  }

  try {
    await redis.set(key, JSON.stringify(entitlements), { ex: CACHE_TTL_S });
  } catch (err) {
    log.warn({ err }, 'Falha ao cachear entitlements');
  }

  return entitlements;
}

export async function invalidateEntitlementsCache(instituicaoId: string): Promise<void> {
  await redis.del(cacheKey(instituicaoId)).catch((err: unknown) => {
    log.warn({ err, instituicaoId }, 'Falha ao invalidar cache de entitlements');
  });
}

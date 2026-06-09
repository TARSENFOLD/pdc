import type { Context, Next } from 'hono';
import pino from 'pino';
import { redis } from '../lib/redis.js';
import { strapiGet } from '../modules/strapi/strapi.client.js';
import { featureFlagService } from '../modules/feature-flags/feature-flags.service.js';
import { eventBus } from '../modules/events/event-bus.js';
import { DomainEventName } from '../modules/events/types.js';
import type { AuthVariables } from '../modules/auth/auth.middleware.js';

const log = pino({ name: 'require-approved' });

const CACHE_TTL_SECONDS = 60;
const GATED_ROLES = new Set(['mentor', 'instituicao']);
const BYPASS_ROLES = new Set(['estudante', 'super_admin', 'comite_cientifico', 'moderador']);

function cacheKey(userId: string): string {
  return `requireApproved:${userId}`;
}

interface StrapiPerfil {
  id: string;
  userId: string;
  aprovado?: boolean;
  instituicaoGerida?: { id?: string | number; estado?: string } | null;
}

async function lookupAprovado(userId: string, role: string): Promise<boolean> {
  let cached: boolean | null = null;
  try {
    cached = await redis.get<boolean>(cacheKey(userId));
  } catch (err) {
    log.error({ err, userId }, '[requireApproved] falha no cache read — fallback para Strapi');
  }
  if (cached !== null) return cached;

  const res = await strapiGet<StrapiPerfil>('/perfis', {
    'filters[userId][$eq]': userId,
    'fields[0]': 'aprovado',
    'populate[instituicaoGerida][fields][0]': 'estado',
    'pagination[pageSize]': '1',
  });

  const perfil = res.data[0];
  const aprovado = role === 'instituicao'
    ? perfil?.instituicaoGerida?.estado === 'verified'
    : perfil?.aprovado === true;

  try {
    await redis.set(cacheKey(userId), aprovado, { ex: CACHE_TTL_SECONDS });
  } catch (err) {
    log.error({ err, userId }, '[requireApproved] falha no cache write — continuando sem cache');
  }
  return aprovado;
}

/**
 * Subscribe to PERFIL_APROVADO / PERFIL_REJEITADO events to invalidate the approval cache.
 * Called once at startup from app initialization.
 */
export function registerApprovalCacheInvalidator(): void {
  const invalidate = async (userId: string) => {
    try {
      await redis.del(cacheKey(userId));
      log.info({ userId }, '[requireApproved] cache invalidado');
    } catch (err) {
      log.error({ err, userId }, '[requireApproved] falha ao invalidar cache via evento');
    }
  };

  eventBus.register(DomainEventName.PERFIL_APROVADO, async (event) => {
    const userId = event.payload['userId'] as string | undefined;
    if (userId) await invalidate(userId);
  });

  eventBus.register(DomainEventName.PERFIL_REJEITADO, async (event) => {
    const userId = event.payload['userId'] as string | undefined;
    if (userId) await invalidate(userId);
  });
}

/**
 * Middleware that blocks content creation for unapproved mentor/instituicao profiles.
 *
 * Kill-switch: when APPROVAL_ENFORCEMENT_ENABLED flag is false, all requests pass through.
 * No-op for: estudante, super_admin, comite_cientifico, moderador.
 * Fail-closed: if Strapi is unavailable, returns 503 (not 500).
 * Redis fallback: if Redis is unavailable, queries Strapi directly.
 */
export function requireApproved() {
  return async (c: Context<{ Variables: AuthVariables }>, next: Next) => {
    const user = c.get('user');

    if (BYPASS_ROLES.has(user.role)) {
      await next();
      return;
    }

    if (!GATED_ROLES.has(user.role)) {
      await next();
      return;
    }

    try {
      const flags = await featureFlagService.getEffectiveFlags(undefined);
      if (!flags['APPROVAL_ENFORCEMENT_ENABLED']) {
        await next();
        return;
      }
    } catch (err) {
      log.error({ err }, '[requireApproved] falha ao ler feature flags — permitindo acesso (fail-open)');
      await next();
      return;
    }

    try {
      const aprovado = await lookupAprovado(user.id, user.role);
      if (!aprovado) {
        return c.json(
          { error: 'Aguarda aprovação para criar conteúdo', code: 'PERFIL_NAO_APROVADO' },
          403,
        );
      }
    } catch (err) {
      log.error({ err, userId: user.id }, '[requireApproved] falha ao verificar aprovação');
      return c.json({ error: 'Serviço de verificação de perfil indisponível' }, 503);
    }

    await next();
  };
}

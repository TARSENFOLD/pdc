import type { Context, Next } from 'hono';
import pino from 'pino';
import { getEntitlements } from '../modules/entitlements/entitlements.service.js';
import type { FeatureFlag } from '@pdc/shared';

const log = pino({ name: 'entitlement-guard' });

interface AuthContext {
  instituicaoId?: string;
  tipo?: string;
}

export function requireEntitlement(requiredFeature: FeatureFlag) {
  return async (c: Context, next: Next) => {
    const auth = c.get('auth') as AuthContext | undefined;
    const instituicaoId = auth?.instituicaoId;

    if (!instituicaoId) {
      return c.json({ error: 'Acesso negado — contexto institucional em falta' }, 403);
    }

    try {
      const entitlements = await getEntitlements(instituicaoId);

      if (!entitlements.features.includes(requiredFeature)) {
        log.warn({ instituicaoId, requiredFeature }, 'Acesso negado — feature não incluída no plano');
        return c.json(
          { error: `Funcionalidade '${requiredFeature}' não disponível no plano actual` },
          403,
        );
      }
    } catch (err) {
      log.error({ err, instituicaoId, requiredFeature }, 'Entitlement guard — fail-closed');
      return c.json({ error: 'Serviço de entitlements indisponível' }, 503);
    }

    await next();
  };
}

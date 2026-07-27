import { env } from '../../lib/env.js';
import { createRateLimiter } from '../../middleware/rateLimit.js';

const TINA_LIMIT_PER_USER = Number(env.TINA_RATE_LIMIT_PER_USER);
const TINA_LIMIT_GLOBAL = Number(env.TINA_RATE_LIMIT_GLOBAL);

// Limites:
// Autenticado: 20/h (default) e 5/min
// Anónimo: 3/h
// Global: 500/h
const userHourLimit = createRateLimiter({
  tokens: TINA_LIMIT_PER_USER,
  window: '1 h',
  keyPrefix: 'tina:user:h',
});
const userMinLimit = createRateLimiter({
  tokens: 5,
  window: '1 m',
  keyPrefix: 'tina:user:m',
});
const anonLimit = createRateLimiter({
  tokens: 3,
  window: '1 h',
  keyPrefix: 'tina:anon',
});
const globalLimit = createRateLimiter({
  tokens: TINA_LIMIT_GLOBAL,
  window: '1 h',
  keyPrefix: 'tina:global',
});

export async function verificarLimite(userId: string | null, ip: string): Promise<{ permitido: boolean; restantes: number; resetEm: number }> {
  const gRes = await globalLimit.limit('global');
  if (!gRes.success) return { permitido: false, restantes: 0, resetEm: gRes.reset };

  if (userId) {
    const hRes = await userHourLimit.limit(userId);
    const mRes = await userMinLimit.limit(userId);
    const success = hRes.success && mRes.success;
    return { 
      permitido: success, 
      restantes: Math.min(hRes.remaining, mRes.remaining), 
      resetEm: Math.max(hRes.reset, mRes.reset) 
    };
  }

  const aRes = await anonLimit.limit(ip);
  return { permitido: aRes.success, restantes: aRes.remaining, resetEm: aRes.reset };
}

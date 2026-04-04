import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

const redis = process.env['UPSTASH_REDIS_REST_URL']
  ? new Redis({
      url: process.env['UPSTASH_REDIS_REST_URL']!,
      token: process.env['UPSTASH_REDIS_REST_TOKEN']!,
    })
  : null;

const TINA_LIMIT_PER_USER = Number(process.env['TINA_RATE_LIMIT_PER_USER'] || 20);
const TINA_LIMIT_GLOBAL = Number(process.env['TINA_RATE_LIMIT_GLOBAL'] || 500);

// Limites: 
// Autenticado: 20/h (default) e 5/min
// Anónimo: 3/h
// Global: 500/h
const userHourLimit = redis ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(TINA_LIMIT_PER_USER, '1 h'), prefix: 'tina:user:h' }) : null;
const userMinLimit = redis ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '1 m'), prefix: 'tina:user:m' }) : null;
const anonLimit = redis ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, '1 h'), prefix: 'tina:anon' }) : null;
const globalLimit = redis ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(TINA_LIMIT_GLOBAL, '1 h'), prefix: 'tina:global' }) : null;

export async function verificarLimite(userId: string | null, ip: string): Promise<{ permitido: boolean; restantes: number; resetEm: number }> {
  if (!redis || !globalLimit) return { permitido: true, restantes: 999, resetEm: 0 };

  const gRes = await globalLimit.limit('global');
  if (!gRes.success) return { permitido: false, restantes: 0, resetEm: gRes.reset };

  if (userId) {
    const hRes = await userHourLimit!.limit(userId);
    const mRes = await userMinLimit!.limit(userId);
    const success = hRes.success && mRes.success;
    return { 
      permitido: success, 
      restantes: Math.min(hRes.remaining, mRes.remaining), 
      resetEm: Math.max(hRes.reset, mRes.reset) 
    };
  } else {
    const aRes = await anonLimit!.limit(ip);
    return { permitido: aRes.success, restantes: aRes.remaining, resetEm: aRes.reset };
  }
}

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import pino from 'pino';

const log = pino({ name: 'telemetria-routes' });
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { redis } from '../lib/redis.js';
import { strapiPost } from '../modules/strapi/strapi.client.js';

const TelemetriaSchema = z.object({
  eventId: z.string().uuid(),
  tipo: z.string(),
  payload: z.unknown(),
  timestamp: z.string(),
});

type Vars = { Variables: AuthVariables };
export const telemetriaRoutes = new Hono<Vars>();

telemetriaRoutes.use('*', verifyJwt);

telemetriaRoutes.post('/', zValidator('json', TelemetriaSchema), async (c) => {
  const user = c.get('user');
  const body = c.req.valid('json');
  
  const redisKey = `telemetria:event:${body.eventId}`;
  
  if (redis) {
    const exists = await redis.get(redisKey);
    if (exists) {
      return c.json({ ok: true, duplicado: true });
    }
  }

  try {
    // Guardar no Strapi (assumindo coleção 'telemetrias')
    await strapiPost('/telemetrias', {
      eventId: body.eventId,
      tipo: body.tipo,
      payload: body.payload,
      timestamp: body.timestamp,
      user: user.id,
    });

    // Marcar no Redis com TTL 24h para idempotência
    if (redis) {
      await redis.set(redisKey, 'true', { ex: 24 * 60 * 60 });
    }

    return c.json({ ok: true });
  } catch (err) {
    log.error({ err }, 'Erro ao processar telemetria');
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 500);
  }
});

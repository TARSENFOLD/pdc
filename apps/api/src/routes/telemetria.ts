import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import pino from 'pino';

const log = pino({ name: 'telemetria-routes' });
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { redis } from '../lib/redis.js';
import { strapiPost } from '../modules/strapi/strapi.client.js';
import { verificarConquistas } from '../modules/conquistas/conquistas.engine.js';

const TelemetriaSchema = z.object({
  eventId: z.string().uuid(),
  tipo: z.string(),
  payload: z.unknown(),
  timestamp: z.string(),
});

const TelemetriaBatchSchema = z.object({
  events: z.array(TelemetriaSchema).min(1).max(50),
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

    // Auto-trigger conquistas engine (fire-and-forget)
    verificarConquistas(user.id, body.tipo).catch((err) =>
      log.error({ err, tipo: body.tipo }, 'Conquistas auto-trigger falhou'),
    );

    return c.json({ ok: true });
  } catch (err) {
    log.error({ err }, 'Erro ao processar telemetria');
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 500);
  }
});

telemetriaRoutes.post('/batch', zValidator('json', TelemetriaBatchSchema), async (c) => {
  const user = c.get('user');
  const { events } = c.req.valid('json');
  const results: Array<{ eventId: string; ok: boolean; duplicado?: boolean }> = [];

  for (const evt of events) {
    const redisKey = `telemetria:event:${evt.eventId}`;

    if (redis) {
      const exists = await redis.get(redisKey);
      if (exists) {
        results.push({ eventId: evt.eventId, ok: true, duplicado: true });
        continue;
      }
    }

    try {
      await strapiPost('/telemetrias', {
        eventId: evt.eventId,
        tipo: evt.tipo,
        payload: evt.payload,
        timestamp: evt.timestamp,
        user: user.id,
      });

      if (redis) {
        await redis.set(redisKey, 'true', { ex: 24 * 60 * 60 });
      }

      results.push({ eventId: evt.eventId, ok: true });

      // Auto-trigger conquistas engine (fire-and-forget)
      verificarConquistas(user.id, evt.tipo).catch((err) =>
        log.error({ err, tipo: evt.tipo }, 'Conquistas auto-trigger falhou'),
      );
    } catch (err) {
      log.error({ err, eventId: evt.eventId }, 'Erro ao processar evento batch');
      results.push({ eventId: evt.eventId, ok: false });
    }
  }

  const hasFailures = results.some((r) => !r.ok);
  if (hasFailures) {
    return c.json({ ok: false, results }, 207);
  }
  return c.json({ ok: true, results });
});

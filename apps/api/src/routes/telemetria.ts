import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import pino from 'pino';
import { TelemetriaEventoSchema, TelemetriaBatchSchema, type TelemetriaEvento } from '@pdc/shared';

const log = pino({ name: 'telemetria-routes' });
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { redis } from '../lib/redis.js';
import { strapiPost, strapiGet } from '../modules/strapi/strapi.client.js';

const CONCURRENCY = 5;

// ─── Profile resolver with Redis cache ───────────────────────────────────────
async function resolvePerfilId(userId: string): Promise<string | null> {
  const cacheKey = `cache:perfil_map:${userId}`;
  const cached = await redis.get(cacheKey);
  if (typeof cached === 'string') return cached === 'null' ? null : cached;

  try {
    const res = await strapiGet<{ id: number }>('/perfis', {
      'filters[userId][$eq]': userId,
      'fields[0]': 'id',
      'pagination[pageSize]': '1',
    });
    const perfilId = res.data[0]?.id ? String(res.data[0].id) : null;
    await redis.set(cacheKey, perfilId || 'null', { ex: 300 });
    return perfilId;
  } catch (err) {
    log.error({ err, userId }, 'Erro ao resolver perfilId');
    return null;
  }
}

// ─── Process single event ────────────────────────────────────────────────────
async function processEvent(
  evt: TelemetriaEvento,
  userId: string,
): Promise<{ eventId: string; ok: boolean; duplicado?: boolean }> {
  const redisKey = `telemetria:event:${evt.eventId}`;

  // Idempotência (Ticket T4 Fix)
  const exists = await redis.get(redisKey);
  if (exists) return { eventId: evt.eventId, ok: true, duplicado: true };

  const perfilId = await resolvePerfilId(userId);

  await strapiPost('/telemetrias', {
    eventId: evt.eventId,
    tipo: evt.tipo,
    dados: evt.payload,
    timestamp: evt.timestamp, // Server-side reference
    clientTimestamp: evt.clientTimestamp, // Precision for Algorithm Phi
    perfil: perfilId,
    sessionId: evt.sessionId,
    correlationId: evt.correlationId,
    url: evt.url,
    targetType: evt.targetType,
    targetId: evt.targetId,
    visibilityState: evt.visibilityState,
  });

  await redis.set(redisKey, 'true', { ex: 24 * 60 * 60 });

  return { eventId: evt.eventId, ok: true };
}

type Vars = { Variables: AuthVariables };
export const telemetriaRoutes = new Hono<Vars>();

telemetriaRoutes.use('*', verifyJwt);

// POST / — single event
telemetriaRoutes.post('/', zValidator('json', TelemetriaEventoSchema), async (c) => {
  const user = c.get('user');
  const body = c.req.valid('json');
  try {
    const result = await processEvent(body, user.id);
    return c.json(result);
  } catch (err: unknown) {
    log.error({ err }, 'Erro telemetria');
    return c.json({ error: 'Erro interno' }, 500);
  }
});

// POST /batch — parallel in chunks
telemetriaRoutes.post('/batch', zValidator('json', TelemetriaBatchSchema), async (c) => {
  const user = c.get('user');
  const { events } = c.req.valid('json');

  const results: any[] = [];
  for (let i = 0; i < events.length; i += CONCURRENCY) {
    const chunk = events.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(chunk.map(evt => processEvent(evt, user.id)));
    
    settled.forEach((s, idx) => {
      const evt = chunk[idx];
      if (s.status === 'fulfilled') {
        results.push(s.value);
      } else {
        const reason = s.status === 'rejected' ? s.reason : 'Erro desconhecido';
        log.error({ err: reason, eventId: evt?.eventId }, 'Erro batch event');
        results.push({ eventId: evt?.eventId ?? 'unknown', ok: false });
      }
    });
  }

  return c.json({ ok: results.every(r => r.ok), results }, results.some(r => !r.ok) ? 207 : 200);
});

// GET /summary
telemetriaRoutes.get('/summary', async (c) => {
  const { userId } = c.req.query();
  const user = c.get('user');

  if (userId && user.id !== userId && user.role !== 'super_admin') {
    return c.json({ error: 'Sem permissão' }, 403);
  }

  const targetUserId = userId || user.id;

  try {
    const perfilId = await resolvePerfilId(targetUserId);
    if (!perfilId) return c.json({ totalEventos: 0, porTipo: {}, ultimoEvento: null });

    const res = await strapiGet<{ tipo: string; clientTimestamp: number | string }>('/telemetrias', {
      'filters[perfil][id][$eq]': perfilId,
      'pagination[pageSize]': '1000',
      'sort': 'createdAt:desc',
    });

    const porTipo: Record<string, number> = {};
    res.data.forEach(item => {
      porTipo[item.tipo] = (porTipo[item.tipo] ?? 0) + 1;
    });

    return c.json({
      totalEventos: res.meta.pagination.total,
      porTipo,
      ultimoEvento: res.data[0]?.clientTimestamp || null,
    });
  } catch (err: unknown) {
    return c.json({ error: 'Erro summary' }, 500);
  }
});

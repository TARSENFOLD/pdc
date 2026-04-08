import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import pino from 'pino';
import { TelemetriaEventoSchema, TelemetriaBatchSchema, type TelemetriaEvento } from '@pdc/shared';

const log = pino({ name: 'telemetria-routes' });
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { redis } from '../lib/redis.js';
import { strapiPost, strapiGet } from '../modules/strapi/strapi.client.js';
import { verificarConquistas } from '../modules/conquistas/conquistas.engine.js';

// ─── Concurrency helper ──────────────────────────────────────────────────────
const CONCURRENCY = 5;

async function mapConcurrent<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = [];
  for (let i = 0; i < items.length; i += limit) {
    const chunk = items.slice(i, i + limit);
    const settled = await Promise.allSettled(chunk.map(fn));
    results.push(...settled);
  }
  return results;
}

// ─── Process single event (shared between single + batch) ────────────────────
async function processEvent(
  evt: TelemetriaEvento,
  userId: string,
): Promise<{ eventId: string; ok: boolean; duplicado?: boolean }> {
  const redisKey = `telemetria:event:${evt.eventId}`;

  if (redis) {
    const exists = await redis.get(redisKey);
    if (exists) {
      return { eventId: evt.eventId, ok: true, duplicado: true };
    }
  }

  await strapiPost('/telemetrias', {
    eventId: evt.eventId,
    tipo: evt.tipo,
    payload: evt.payload,
    timestamp: evt.timestamp,
    user: userId,
  });

  if (redis) {
    await redis.set(redisKey, 'true', { ex: 24 * 60 * 60 });
  }

  // Auto-trigger conquistas engine (fire-and-forget)
  verificarConquistas(userId, evt.tipo).catch((err) =>
    log.error({ err, tipo: evt.tipo }, 'Conquistas auto-trigger falhou'),
  );

  return { eventId: evt.eventId, ok: true };
}

type Vars = { Variables: AuthVariables };
export const telemetriaRoutes = new Hono<Vars>();

telemetriaRoutes.use('*', verifyJwt);

// ─── POST / — single event ───────────────────────────────────────────────────
telemetriaRoutes.post('/', zValidator('json', TelemetriaEventoSchema), async (c) => {
  const user = c.get('user');
  const body = c.req.valid('json');

  try {
    const result = await processEvent(body, String(user.id));
    return c.json(result);
  } catch (err) {
    log.error({ err }, 'Erro ao processar telemetria');
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 500);
  }
});

// ─── POST /batch — parallel in chunks of CONCURRENCY ─────────────────────────
telemetriaRoutes.post('/batch', zValidator('json', TelemetriaBatchSchema), async (c) => {
  const user = c.get('user');
  const { events } = c.req.valid('json');

  const settled = await mapConcurrent(events, CONCURRENCY, (evt) =>
    processEvent(evt, String(user.id)),
  );

  const results = settled.map((s, i) => {
    if (s.status === 'fulfilled') return s.value;
    log.error({ err: s.reason, eventId: events[i].eventId }, 'Erro ao processar evento batch');
    return { eventId: events[i].eventId, ok: false };
  });

  const hasFailures = results.some((r) => !r.ok);
  if (hasFailures) {
    return c.json({ ok: false, results }, 207);
  }
  return c.json({ ok: true, results });
});

// ─── GET /summary — counts by type for a user ────────────────────────────────
const SummaryQuerySchema = z.object({
  userId: z.string().min(1),
});

telemetriaRoutes.get('/summary', zValidator('query', SummaryQuerySchema), async (c) => {
  const { userId } = c.req.valid('query');
  const user = c.get('user');

  // Users can only query their own summary (admins can query any)
  if (String(user.id) !== userId && user.role !== 'super_admin') {
    return c.json({ error: 'Sem permissão' }, 403);
  }

  try {
    // Fetch all telemetria for user (paginated by Strapi, grab up to 1000)
    const res = await strapiGet<{
      data: Array<{ tipo: string; timestamp: string }>;
      meta?: { pagination?: { total: number } };
    }>('/telemetrias', {
      'filters[user][$eq]': userId,
      'fields[0]': 'tipo',
      'fields[1]': 'timestamp',
      'pagination[pageSize]': '1000',
      'sort': 'timestamp:desc',
    });

    const items = res?.data ?? [];
    const porTipo: Record<string, number> = {};
    let ultimoEvento: string | null = null;

    for (const item of items) {
      porTipo[item.tipo] = (porTipo[item.tipo] ?? 0) + 1;
      if (!ultimoEvento && item.timestamp) {
        ultimoEvento = item.timestamp;
      }
    }

    return c.json({
      totalEventos: res?.meta?.pagination?.total ?? items.length,
      porTipo,
      ultimoEvento,
    });
  } catch (err) {
    log.error({ err }, 'Erro ao obter summary');
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 500);
  }
});

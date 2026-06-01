import { Hono } from 'hono';
import { jwsVerifyMiddleware } from './middleware/jws-verify';
import {
  applySanityRules,
  EDGE_SANITY_RULES,
  TelemetriaBatchSchema,
  type TelemetriaEvento,
} from '@pdc/shared';

const START_TIME = Date.now();

type Bindings = {
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;
  TELEMETRY_SECRET: string;
  BFF_URL: string;
};

type Variables = {
  userId: string;
  perfilId: string;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Enhanced fetch with AbortController timeout.
 */
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 2000) {
  const controller = new AbortController();
  const id = setTimeout(() => { controller.abort(); }, timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

/**
 * Deduplicates a batch of events using Upstash Redis SET NX EX (atomic, 7-day TTL).
 * Resolves D6 midnight-rollover: a retried event with the same eventId is silently dropped.
 * Returns only events whose eventId had not been seen before.
 */
async function deduplicateEvents(
  events: TelemetriaEvento[],
  redisUrl: string,
  redisToken: string,
): Promise<{ newEvents: TelemetriaEvento[]; dedupedCount: number }> {
  const pipeline = events.map((e) => [
    'SET',
    `tel:evt:${e.eventId}`,
    '1',
    'EX',
    '604800', // 7 days
    'NX',
  ]);

  const response = await fetchWithTimeout(`${redisUrl}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${redisToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(pipeline),
  });

  if (!response.ok) throw new Error('Redis pipeline falhou');

  type UpstashPipelineResult = { result: unknown } | { error: string };
  const results: UpstashPipelineResult[] = await response.json();

  // Saneamento forense: Se algum comando no pipeline falhou, abortar para auditoria
  for (const res of results) {
    if ('error' in res) {
      throw new Error(`Upstash Redis Pipeline Error: ${res.error}`);
    }
  }

  const newEvents = events.filter((_e, i) => {
    const res = results[i];
    return 'result' in res && res.result === 'OK';
  });
  return { newEvents, dedupedCount: events.length - newEvents.length };
}

// ─── Middleware: Validação de Autoridade ─────────────────────────────────────

app.use('/telemetria/batch/*', jwsVerifyMiddleware);

// ─── Endpoints ───────────────────────────────────────────────────────────────

/**
 * GET /health
 * Smoke test / health check pós-deploy.
 */
app.get('/health', (c) => {
  const cf = c.req.raw.cf as Record<string, unknown> | undefined;
  return c.json({
    status: 'ok',
    version: '1.0.0',
    region: (cf?.colo as string | undefined) ?? 'local',
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
  });
});

/**
 * POST /telemetria/batch
 * Ingestor de alta performance no Edge com idempotência por eventId (E2-T2).
 */
app.post('/telemetria/batch', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'JSON inválido' }, 400);
  }

  const result = TelemetriaBatchSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: 'Payload de telemetria inválido', details: result.error.format() }, 400);
  }

  const { events } = result.data;
  const perfilId = c.get('perfilId');

  // ── Deduplicação (E2-T2): SET NX EX 7d por eventId ──────────────────────
  let newEvents: TelemetriaEvento[];
  let dedupedCount: number;
  try {
    ({ newEvents, dedupedCount } = await deduplicateEvents(
      events,
      c.env.UPSTASH_REDIS_REST_URL,
      c.env.UPSTASH_REDIS_REST_TOKEN,
    ));
  } catch (err) {
    console.error('Edge Redis Dedup Error:', err);
    return c.json({ error: 'Buffer Indisponível' }, 503);
  }

  if (newEvents.length === 0) {
    return c.json({ success: true, count: 0, deduped: dedupedCount }, 202);
  }

  // ── Sanidade + Identidade Total ──────────────────────────────────────────
  const processedEvents = newEvents.map((event: TelemetriaEvento) => {
    const identifiedEvent = {
      ...event,
      perfilId: event.perfilId || perfilId,
    };

    const sanity = applySanityRules(identifiedEvent, EDGE_SANITY_RULES);

    if (!sanity.valid) {
      // REGRA SOBERANA: Não descartar. Etiquetar para auditoria forense no BFF.
      return {
        ...identifiedEvent,
        metadata: {
          ...identifiedEvent.payload,
          edgeInvalidated: true,
          edgeReason: sanity.reason,
        },

      };
    }
    return identifiedEvent;
  });

  // ── Push para Upstash Redis Queue ────────────────────────────────────────
  try {
    const response = await fetchWithTimeout(`${c.env.UPSTASH_REDIS_REST_URL}/lpush/telemetry_queue`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${c.env.UPSTASH_REDIS_REST_TOKEN}` },
      body: JSON.stringify(processedEvents.map((e) => JSON.stringify(e))),
    });

    if (!response.ok) throw new Error('Falha no buffer Redis');

    return c.json({ success: true, count: processedEvents.length, deduped: dedupedCount }, 202);
  } catch (err) {
    console.error('Edge Redis Queue Error:', err);
    return c.json({ error: 'Buffer Indisponível' }, 503);
  }
});

/**
 * POST /landing/pulse
 * Tracking Identificado para landing page (exige rasto/session).
 */
app.post('/landing/pulse', async (c) => {
  let body: { rastoId: string };
  try {
    body = await c.req.json<{ rastoId: string }>();
  } catch {
    return c.json({ error: 'JSON inválido' }, 400);
  }

  const { rastoId } = body;

  if (!rastoId) {
    return c.json({ error: 'Identificador de rasto obrigatório (Lei da Identidade Total)' }, 400);
  }

  try {
    const response = await fetchWithTimeout(`${c.env.UPSTASH_REDIS_REST_URL}/sadd/landing_visitors`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${c.env.UPSTASH_REDIS_REST_TOKEN}` },
      body: JSON.stringify([rastoId]),
    });

    if (!response.ok) throw new Error('Falha no buffer Redis');

    return c.json({ success: true }, 202);
  } catch (err) {
    console.error('Edge Redis Pulse Error:', err);
    return c.json({ error: 'Buffer Indisponível' }, 503);
  }
});

app.all('*', async (c) => {
  const url = new URL(c.req.url);
  if (url.hostname !== 'api.usepdc.com') {
    return c.json({ error: 'Not found' }, 404);
  }

  const target = new URL(url.pathname + url.search, c.env.BFF_URL);
  const headers = new Headers(c.req.raw.headers);
  headers.set('host', target.hostname);
  headers.set('x-forwarded-host', url.hostname);
  headers.set('x-forwarded-proto', url.protocol.replace(':', ''));

  return fetch(target.toString(), {
    method: c.req.method,
    headers,
    body: c.req.raw.body,
    redirect: 'manual',
  });
});


export default app;

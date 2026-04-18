import { Hono } from 'hono';
import { jwsVerifyMiddleware } from './middleware/jws-verify';
import { applySanityRules, EDGE_SANITY_RULES } from '@pdc/shared';

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

// ─── Middleware: Validação de Autoridade ─────────────────────────────────────
// Valida o Telemetry Token RS256 usando a cache JWKS do BFF.
app.use('/telemetria/batch/*', jwsVerifyMiddleware);

// ─── Endpoints de Ingestão ───────────────────────────────────────────────────

/**
 * POST /telemetria/batch
 * Ingestor de alta performance no Edge.
 */
app.post('/telemetria/batch', async (c) => {
  // Casting para unknown para garantir segurança total nas boundaries de I/O
  const parsed = (await c.req.json()) as unknown;
  
  const events: unknown[] = (
    typeof parsed === 'object' && 
    parsed !== null && 
    'events' in parsed && 
    Array.isArray((parsed as { events: unknown }).events)
  ) ? (parsed as { events: unknown[] }).events : [];

  if (events.length === 0) return c.json({ success: true });

  const validEvents: unknown[] = [];
  for (const rawEvent of events) {
    if (typeof rawEvent === 'object' && rawEvent !== null && 'eventId' in rawEvent && 'timestamp' in rawEvent) {
      const sanity = applySanityRules(rawEvent as any, EDGE_SANITY_RULES);
      if (sanity.valid) {
        validEvents.push(rawEvent);
      } else {
        console.warn(`Evento rejeitado no Edge (Sanity ${sanity.ruleName}):`, sanity.reason);
      }
    }
  }

  if (validEvents.length === 0) return c.json({ success: true, count: 0 }, 202);

  // Push para Upstash Redis (Queue)
  try {
    const response = await fetch(`${c.env.UPSTASH_REDIS_REST_URL}/lpush/telemetry_queue`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${c.env.UPSTASH_REDIS_REST_TOKEN}` },
      body: JSON.stringify(validEvents.map((e: unknown) => JSON.stringify(e))),
    });

    if (!response.ok) throw new Error('Falha no buffer Redis');

    return c.json({ success: true, count: validEvents.length }, 202);
  } catch {
    return c.json({ error: 'Buffer Indisponível' }, 503);
  }
});

/**
 * POST /landing/pulse
 * Tracking anónimo para landing page.
 */
app.post('/landing/pulse', async (c) => {
  // Consumimos o stream do body mesmo que não precisemos do conteúdo
  await c.req.text(); 
  
  // Incremento de contagem global de talentos
  await fetch(`${c.env.UPSTASH_REDIS_REST_URL}/incr/pulse_count`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${c.env.UPSTASH_REDIS_REST_TOKEN}` },
  });
  return c.json({ success: true }, 202);
});

export default app;

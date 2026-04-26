import { Hono } from 'hono';
import { jwsVerifyMiddleware } from './middleware/jws-verify';
import { 
  applySanityRules, 
  EDGE_SANITY_RULES, 
  TelemetriaBatchSchema, 
  type TelemetriaEvento 
} from '@pdc/shared';

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
 * Ingestor de alta performance no Edge com Tipagem Soberana.
 */
app.post('/telemetria/batch', async (c) => {
  const body = await c.req.json();
  const result = TelemetriaBatchSchema.safeParse(body);
  
  if (!result.success) {
    return c.json({ error: 'Payload de telemetria inválido', details: result.error.format() }, 400);
  }

  const { events } = result.data;
  const perfilId = c.get('perfilId');

  const processedEvents = events.map((event: TelemetriaEvento) => {
    // Garantir Identidade Total: Injetar perfilId do token se ausente
    const identifiedEvent = {
      ...event,
      perfilId: event.perfilId || perfilId
    };

    // Aplicar sanidade no Edge (Camada 1)
    const sanity = applySanityRules(identifiedEvent, EDGE_SANITY_RULES);

    if (!sanity.valid) {
      // REGRA SOBERANA: Não descartar. Etiquetar para auditoria forense no BFF.
      return {
        ...identifiedEvent,
        metadata: {
          ...(identifiedEvent.payload || {}),
          edgeInvalidated: true,
          edgeReason: sanity.reason
        }
      };
    }
    return identifiedEvent;
  });

  // Push para Upstash Redis (Queue)
  try {
    const response = await fetch(`${c.env.UPSTASH_REDIS_REST_URL}/lpush/telemetry_queue`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${c.env.UPSTASH_REDIS_REST_TOKEN}` },
      body: JSON.stringify(processedEvents.map(e => JSON.stringify(e))),
    });

    if (!response.ok) throw new Error('Falha no buffer Redis');

    return c.json({ success: true, count: processedEvents.length }, 202);
  } catch {
    return c.json({ error: 'Buffer Indisponível' }, 503);
  }
});

/**
 * POST /landing/pulse
 * Tracking Identificado para landing page (exige rasto/session).
 */
app.post('/landing/pulse', async (c) => {
  const { rastoId } = await c.req.json<{ rastoId: string }>();
  
  if (!rastoId) {
    return c.json({ error: 'Identificador de rasto obrigatório (Lei da Identidade Total)' }, 400);
  }
  
  // Incremento de contagem global de talentos identificado pelo rasto
  await fetch(`${c.env.UPSTASH_REDIS_REST_URL}/sadd/landing_visitors`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${c.env.UPSTASH_REDIS_REST_TOKEN}` },
    body: JSON.stringify([rastoId])
  });

  return c.json({ success: true }, 202);
});

export default app;

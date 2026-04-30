import { Hono } from 'hono';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { strapiGet } from '../modules/strapi/strapi.client.js';

type Vars = { Variables: AuthVariables };

export const domainEventRoutes = new Hono<Vars>();

domainEventRoutes.use('*', verifyJwt);

type HookStatus = 'sent' | 'success' | 'skipped' | 'retryable_error' | 'fatal_error' | 'error';

interface HookResult {
  status: HookStatus;
  reason?: string;
  data?: unknown;
}

interface StrapiDomainEvent {
  id: string | number;
  documentId?: string;
  name: string;
  payload: Record<string, unknown>;
  correlationId: string;
  processed: boolean;
  processedAt?: string;
  attempts?: number;
  hookResults?: Record<string, HookResult>;
  createdAt: string;
  updatedAt: string;
}

interface ImpactSummary {
  totalHooks: number;
  success: number;
  skipped: number;
  errors: number;
  processed: boolean;
}

async function findEventByPublicId(id: string): Promise<StrapiDomainEvent | null> {
  const byCorrelation = await strapiGet<StrapiDomainEvent>('/domain-events', {
    'filters[correlationId][$eq]': id,
    'pagination[pageSize]': '1',
  });

  if (byCorrelation.data[0]) return byCorrelation.data[0];

  const byDocumentId = await strapiGet<StrapiDomainEvent>('/domain-events', {
    'filters[documentId][$eq]': id,
    'pagination[pageSize]': '1',
  });

  if (byDocumentId.data[0]) return byDocumentId.data[0];

  if (/^\d+$/.test(id)) {
    const byNumericId = await strapiGet<StrapiDomainEvent>('/domain-events', {
      'filters[id][$eq]': id,
      'pagination[pageSize]': '1',
    });
    return byNumericId.data[0] ?? null;
  }

  return null;
}

function summarizeImpact(event: StrapiDomainEvent): ImpactSummary {
  const hooks = Object.values(event.hookResults ?? {});

  return {
    totalHooks: hooks.length,
    success: hooks.filter((result) => result.status === 'sent' || result.status === 'success').length,
    skipped: hooks.filter((result) => result.status === 'skipped').length,
    errors: hooks.filter((result) => result.status === 'retryable_error' || result.status === 'fatal_error' || result.status === 'error').length,
    processed: event.processed,
  };
}

/**
 * GET /domain-events/:id/my-impact
 * Aggregate-safe impact route for creators. It intentionally does not expose
 * payload or raw hookResults, because those remain operational/admin data.
 */
domainEventRoutes.get('/:id/my-impact', async (c) => {
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'Evento não encontrado' }, 404);

  const event = await findEventByPublicId(id);
  if (!event) return c.json({ error: 'Evento não encontrado' }, 404);

  return c.json({
    eventId: event.correlationId,
    name: event.name,
    impact: summarizeImpact(event),
  });
});

/**
 * GET /domain-events/:id
 * Full impact route for moderation/operations.
 */
domainEventRoutes.get('/:id', checkRole(['moderador', 'super_admin']), async (c) => {
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'Evento não encontrado' }, 404);

  const event = await findEventByPublicId(id);
  if (!event) return c.json({ error: 'Evento não encontrado' }, 404);

  return c.json({
    event: {
      id: String(event.id),
      documentId: event.documentId,
      name: event.name,
      correlationId: event.correlationId,
      payload: event.payload,
      processed: event.processed,
      processedAt: event.processedAt,
      attempts: event.attempts ?? 0,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    },
    impact: {
      ...summarizeImpact(event),
      hookResults: event.hookResults ?? {},
    },
  });
});

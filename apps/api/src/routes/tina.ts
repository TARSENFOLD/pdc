import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { zValidator } from '@hono/zod-validator';
import { getCookie } from 'hono/cookie';
import { jwtVerify } from 'jose';
import { z } from 'zod';
import pino from 'pino';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { tinaService } from '../modules/tina/tina.service.js';
import { strapiGet, strapiPost } from '../modules/strapi/strapi.client.js';
import { ChatPayloadSchema } from '@pdc/shared';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { env } from '../lib/env.js';

const log = pino({ name: 'routes:tina' });

const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET);

export const tinaRoutes = new Hono<{ Variables: AuthVariables }>();

// POST /tina/chat — Auth opcional
tinaRoutes.post('/chat', zValidator('json', ChatPayloadSchema), async (c) => {
  const { message, messages, stream } = c.req.valid('json');
  const prompt = message ?? messages?.at(-1)?.content;
  if (!prompt) return c.json({ error: 'message is required' }, 400);
  const ip = c.req.header('x-forwarded-for') || '127.0.0.1';
  
  // Tentar extrair userId do cookie se existir
  let userId: string | null = null;
  const token = getCookie(c, 'access_token');
  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      userId = payload.sub as string;
    } catch {
      // Ignora erro de auth opcional
    }
  }

  const res = await tinaService.chat(messages ?? [{ role: 'user', content: prompt }], userId, ip, stream);

  if (!res.ok) {
    const providerError: unknown = await res.json().catch(() => null);
    log.warn({ providerStatus: res.status }, 'Tina provider rejected request');
    return c.json(
      {
        error: res.status === 401
          ? 'A Tina está temporariamente indisponível por falha de autenticação do provedor.'
          : 'A Tina está temporariamente indisponível.',
        providerError: providerError === null ? undefined : 'provider_request_rejected',
      },
      (res.status === 401 ? 503 : res.status) as ContentfulStatusCode,
    );
  }

  if (stream) {
    return streamSSE(c, async (sseStream) => {
      const reader = res.body?.getReader();
      if (!reader) {
        await sseStream.writeSSE({ event: 'error', data: JSON.stringify({ error: 'Stream não disponível' }) });
        return;
      }
      const decoder = new TextDecoder();
      try {
        // Heartbeat: tell clients to reconnect after 3s if connection drops
        await sseStream.writeSSE({ event: 'connected', data: '{}', retry: 3000 });
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        while (true) {
          const { done, value } = await reader.read() as { done: boolean; value: Uint8Array | undefined };
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          if (chunk) {
            await sseStream.writeSSE({ data: chunk });
          }
        }
        await sseStream.writeSSE({ event: 'done', data: '{}' });
      } catch (err) {
        log.error({ err }, 'Tina SSE stream error');
        await sseStream.writeSSE({ event: 'error', data: JSON.stringify({ error: 'Erro no streaming. Reconecta automaticamente.' }) });
      } finally {
        reader.releaseLock();
      }
    });
  }

  const data = await res.json() as Record<string, unknown>;
  return c.json(data);
});

// POST /tina/indexar
tinaRoutes.post('/indexar', verifyJwt, checkRole(['super_admin']), async (c) => {
  await tinaService.indexarKnowledge();
  return c.json({ status: 'ok', message: 'Conhecimento da Tina indexado.' });
});

// GET /tina/stats
tinaRoutes.get('/stats', verifyJwt, checkRole(['super_admin']), (c) => {
  return c.json({
    status: 'active',
    provider: env.AI_PROVIDER,
    limitPerUser: env.TINA_RATE_LIMIT_PER_USER,
  });
});

// GET /tina/insights — lista insights da Tina ancorados a um contexto
tinaRoutes.get('/insights', verifyJwt, zValidator('query', z.object({
  anchorType: z.enum(['simulacao', 'perfil', 'curso']).optional(),
  anchorId: z.string().optional(),
})), async (c) => {
  const { id: userId } = c.get('user');
  const { anchorType, anchorId } = c.req.valid('query');
  try {
    const filters: Record<string, string> = {
      'filters[userId][$eq]': userId,
    };
    if (anchorType) filters['filters[anchorType][$eq]'] = anchorType;
    if (anchorId) filters['filters[anchorId][$eq]'] = anchorId;

    const res = await strapiGet<unknown>('/tina-insights', {
      ...filters,
      'sort': 'createdAt:desc',
      'pagination[limit]': '50',
    });
    return c.json(res);
  } catch (err) {
    log.error({ err }, 'Erro ao buscar Tina insights');
    return c.json({ error: 'Erro ao buscar insights' }, 502);
  }
});

// POST /tina/insights — cria insight ancorado
tinaRoutes.post('/insights', verifyJwt, zValidator('json', z.object({
  anchorType: z.enum(['simulacao', 'perfil', 'curso']),
  anchorId: z.string(),
  text: z.string().min(1).max(2000),
})), async (c) => {
  const { id: userId } = c.get('user');
  const { anchorType, anchorId, text } = c.req.valid('json');
  try {
    const res = await strapiPost<unknown>('/tina-insights', {
      userId,
      anchorType,
      anchorId,
      text,
      createdAt: new Date().toISOString(),
    });
    return c.json(res, 201);
  } catch (err) {
    log.error({ err }, 'Erro ao criar Tina insight');
    return c.json({ error: 'Erro ao guardar insight' }, 502);
  }
});

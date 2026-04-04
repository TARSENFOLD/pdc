import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { zValidator } from '@hono/zod-validator';
import { getCookie } from 'hono/cookie';
import { jwtVerify } from 'jose';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { tinaService } from '../modules/tina/tina.service.js';
import { ChatPayloadSchema } from '@pdc/shared';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'change-me-in-production-min-32-chars'
);

export const tinaRoutes = new Hono<{ Variables: AuthVariables }>();

// POST /tina/chat — Auth opcional
tinaRoutes.post('/chat', zValidator('json', ChatPayloadSchema), async (c) => {
  const { message, stream } = c.req.valid('json');
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

  const res = await tinaService.chat([{ role: 'user', content: message }], userId, ip, !!stream);

  if (!res.ok) {
    const errorData = await res.json() as { error: string };
    return c.json(errorData, res.status as any);
  }

  if (stream) {
    return streamSSE(c, async (sseStream) => {
      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await sseStream.writeSSE({ data: decoder.decode(value) });
      }
    });
  }

  const data = await res.json() as unknown;
  return c.json(data);
});

// POST /tina/indexar
tinaRoutes.post('/indexar', verifyJwt, checkRole(['super_admin']), async (c) => {
  await tinaService.indexarKnowledge();
  return c.json({ status: 'ok', message: 'Conhecimento da Tina indexado.' });
});

// GET /tina/stats
tinaRoutes.get('/stats', verifyJwt, checkRole(['super_admin']), async (c) => {
  // Stats básicas (placeholder)
  return c.json({
    status: 'active',
    provider: process.env.AI_PROVIDER || 'deepseek',
    limitPerUser: process.env.TINA_RATE_LIMIT_PER_USER || 20,
  });
});

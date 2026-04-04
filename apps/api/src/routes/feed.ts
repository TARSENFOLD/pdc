import { Hono, type Context } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { feedService } from '../modules/feed/feed.service.js';
import { getCookie } from 'hono/cookie';
import { jwtVerify } from 'jose';

export const feedRoutes = new Hono();

const feedQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(10),
});

async function getOptionalUserId(c: Context): Promise<string | undefined> {
  try {
    const token = getCookie(c, 'access_token');
    if (!token) return undefined;
    const JWT_SECRET = new TextEncoder().encode(process.env['JWT_SECRET'] || 'change-me-in-production-min-32-chars');
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.sub as string;
  } catch {
    return undefined;
  }
}

feedRoutes.get('/', zValidator('query', feedQuerySchema), async (c) => {
  const { page, pageSize } = c.req.valid('query');
  const userId = await getOptionalUserId(c);

  try {
    const data = await feedService.getFeed(page, pageSize, userId);
    return c.json({
      data,
      meta: {
        page,
        pageSize,
        hasMore: data.length === pageSize,
      }
    });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro ao carregar feed' }, 500);
  }
});

feedRoutes.get('/trending', async (c) => {
  try {
    const data = await feedService.getTrendingFeed();
    return c.json({ data });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro ao carregar trending' }, 500);
  }
});


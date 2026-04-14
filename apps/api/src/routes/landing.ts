import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { Ratelimit } from '@upstash/ratelimit';
import { redis } from '../lib/redis.js';
import { pulseService } from '../modules/landing/pulse.service.js';

const activitySchema = z.object({
  sessionId: z.string().min(1).max(64),
  area: z.string().optional(),
});

const pulseLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  analytics: true,
  prefix: 'ratelimit:landing-pulse',
});

export const landingRoutes = new Hono();

landingRoutes.post(
  '/pulse',
  async (c, next) => {
    const ip = c.req.header('x-forwarded-for') || '127.0.0.1';
    const { success, limit, reset, remaining } = await pulseLimiter.limit(ip);

    c.header('X-RateLimit-Limit', limit.toString());
    c.header('X-RateLimit-Remaining', remaining.toString());
    c.header('X-RateLimit-Reset', reset.toString());

    if (!success) {
      return c.json({ error: 'Too many requests' }, 429);
    }

    await next();
  },
  zValidator('json', activitySchema),
  (c) => {
    const { sessionId, area } = c.req.valid('json');
    pulseService.recordActivity(sessionId, area);
    return c.json({ ok: true });
  },
);

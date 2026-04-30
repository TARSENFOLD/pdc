import { Ratelimit } from '@upstash/ratelimit';
import { redis, hasRedis } from '../lib/redis.js';
import type { Context, Next } from 'hono';
import pino from 'pino';

const log = pino({ name: 'rate-limit' });

function shouldBypassDevAuthLimits(): boolean {
  return process.env['NODE_ENV'] !== 'production' && process.env['DEV_SKIP_OTP'] === 'true';
}

const ratelimit = hasRedis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 m'),
      analytics: true,
      prefix: 'ratelimit',
    })
  : null;

export async function rateLimit(c: Context, next: Next) {
  if (shouldBypassDevAuthLimits()) {
    await next();
    return;
  }

  if (!ratelimit) {
    log.warn('Redis not configured, rate limiting skipped');
    await next();
    return;
  }

  const ip = c.req.header('x-forwarded-for') || '127.0.0.1';
  const { success, limit, reset, remaining } = await ratelimit.limit(ip);

  c.header('X-RateLimit-Limit', limit.toString());
  c.header('X-RateLimit-Remaining', remaining.toString());
  c.header('X-RateLimit-Reset', reset.toString());

  if (!success) {
    return c.json({ error: 'Too many requests' }, 429);
  }

  await next();
}

const ratelimitRegisto = hasRedis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, '1 h'),
      analytics: true,
      prefix: 'ratelimit:registo',
    })
  : null;

export async function rateLimitRegisto(c: Context, next: Next) {
  if (shouldBypassDevAuthLimits()) {
    await next();
    return;
  }

  if (!ratelimitRegisto) {
    log.warn('Redis not configured, rate limiting skipped');
    await next();
    return;
  }

  const ip = c.req.header('x-forwarded-for') || '127.0.0.1';
  const { success, limit, reset, remaining } = await ratelimitRegisto.limit(ip);

  c.header('X-RateLimit-Limit', limit.toString());
  c.header('X-RateLimit-Remaining', remaining.toString());
  c.header('X-RateLimit-Reset', reset.toString());

  if (!success) {
    return c.json({ error: 'Too many requests' }, 429);
  }

  await next();
}

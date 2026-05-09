import { Ratelimit } from '@upstash/ratelimit';
import { redis, hasRedis } from '../lib/redis.js';
import type { Context, Next } from 'hono';
import pino from 'pino';
import { env } from '../lib/env.js';
import type { AuthVariables, OptionalAuthVariables } from '../modules/auth/auth.middleware.js';

const log = pino({ name: 'rate-limit' });

type RateLimitWindow = `${number} ${'s' | 'm' | 'h' | 'd'}`;
type RateLimitKey = 'ip' | 'user';
type RateLimitContext = Context<{ Variables: AuthVariables | OptionalAuthVariables }>;

export interface RateLimitOptions {
  tokens: number;
  window: RateLimitWindow;
  keyPrefix: string;
  key: RateLimitKey;
}

interface LimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

const memoryBuckets = new Map<string, { count: number; reset: number }>();

function shouldBypassDevAuthLimits(): boolean {
  return process.env['NODE_ENV'] !== 'production' && process.env['DEV_SKIP_OTP'] === 'true';
}

function getClientIp(c: Context): string {
  const xForwardedFor = c.req.header('x-forwarded-for') ?? '';
  const firstForwardedIp = xForwardedFor.split(',')[0]?.trim() ?? '';
  return firstForwardedIp || c.req.header('x-real-ip') || '127.0.0.1';
}

function getUserId(c: RateLimitContext): string | null {
  try {
    return c.get('user')?.id ?? null;
  } catch {
    return null;
  }
}

function applyProfile(tokens: number): number {
  if (env.RATE_LIMIT_PROFILE === 'off') return Number.POSITIVE_INFINITY;
  if (env.RATE_LIMIT_PROFILE === 'permissive') return tokens * 10;
  return tokens;
}

function parseWindowMs(window: RateLimitWindow): number {
  const [amountRaw, unit] = window.split(' ');
  const amount = Number(amountRaw);
  const multipliers: Record<'s' | 'm' | 'h' | 'd', number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  if (unit !== 's' && unit !== 'm' && unit !== 'h' && unit !== 'd') return amount * 60 * 1000;
  return amount * multipliers[unit];
}

function memoryLimit(storageKey: string, limit: number, window: RateLimitWindow): LimitResult {
  const now = Date.now();
  const windowMs = parseWindowMs(window);
  const bucket = memoryBuckets.get(storageKey);
  if (!bucket || bucket.reset <= now) {
    const reset = now + windowMs;
    memoryBuckets.set(storageKey, { count: 1, reset });
    return { success: true, limit, remaining: Math.max(limit - 1, 0), reset };
  }

  bucket.count += 1;
  return {
    success: bucket.count <= limit,
    limit,
    remaining: Math.max(limit - bucket.count, 0),
    reset: bucket.reset,
  };
}

function createLimiter(options: RateLimitOptions) {
  const profiledTokens = applyProfile(options.tokens);
  if (!Number.isFinite(profiledTokens)) return null;

  return hasRedis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(profiledTokens, options.window),
        analytics: true,
        prefix: `ratelimit:${options.keyPrefix}`,
      })
    : null;
}

export function createRateLimit(options: RateLimitOptions) {
  const profiledTokens = applyProfile(options.tokens);
  const limiter = createLimiter(options);

  return async function rateLimitMiddleware(c: RateLimitContext, next: Next) {
    if (!Number.isFinite(profiledTokens)) {
      await next();
      return;
    }

    const identity = options.key === 'user'
      ? getUserId(c) ?? `ip:${getClientIp(c)}`
      : getClientIp(c);
    const storageKey = `${options.keyPrefix}:${identity}`;

    let result: LimitResult | null = null;
    if (limiter) {
      result = await limiter.limit(identity);
    } else if (env.NODE_ENV === 'test') {
      result = memoryLimit(storageKey, profiledTokens, options.window);
    } else {
      log.warn({ keyPrefix: options.keyPrefix }, 'Redis not configured, rate limiting skipped');
      await next();
      return;
    }

    c.header('X-RateLimit-Limit', result.limit.toString());
    c.header('X-RateLimit-Remaining', result.remaining.toString());
    c.header('X-RateLimit-Reset', result.reset.toString());

    if (!result.success) {
      const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
      c.header('Retry-After', retryAfter.toString());
      return c.json({ error: 'Too many requests', code: 'RATE_LIMITED' }, 429);
    }

    await next();
  };
}

export const rateLimitComments = createRateLimit({ tokens: 10, window: '1 m', keyPrefix: 'comments', key: 'user' });
export const rateLimitInteractions = createRateLimit({ tokens: 30, window: '1 m', keyPrefix: 'interactions', key: 'user' });
export const rateLimitTelemetry = createRateLimit({ tokens: 120, window: '1 m', keyPrefix: 'telemetria', key: 'user' });
export const rateLimitDenuncias = createRateLimit({ tokens: 5, window: '1 h', keyPrefix: 'denuncias', key: 'user' });
export const rateLimitContentCreate = createRateLimit({ tokens: 20, window: '1 h', keyPrefix: 'content-create', key: 'user' });
export const rateLimitMediaUpload = createRateLimit({ tokens: 10, window: '1 h', keyPrefix: 'media-upload', key: 'user' });
export const rateLimitGlobalIp = createRateLimit({ tokens: 1000, window: '1 m', keyPrefix: 'global', key: 'ip' });

const ratelimit = createRateLimit({ tokens: 5, window: '1 m', keyPrefix: 'auth', key: 'ip' });

export async function rateLimit(c: Context, next: Next) {
  if (shouldBypassDevAuthLimits()) {
    await next();
    return;
  }
  return ratelimit(c as RateLimitContext, next);
}

const ratelimitRegisto = createRateLimit({ tokens: 3, window: '1 h', keyPrefix: 'registo', key: 'ip' });

export async function rateLimitRegisto(c: Context, next: Next) {
  if (shouldBypassDevAuthLimits()) {
    await next();
    return;
  }
  return ratelimitRegisto(c as RateLimitContext, next);
}

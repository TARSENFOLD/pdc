import { Ratelimit } from '@upstash/ratelimit';
import { upstashRedis } from '../lib/redis.js';
import type { Context, Next } from 'hono';
import pino from 'pino';
import { env } from '../lib/env.js';

const log = pino({ name: 'rate-limit' });

export type RateLimitWindow = `${number} ${'s' | 'm' | 'h' | 'd'}`;
type RateLimitKey = 'ip' | 'user';

export interface RateLimiterOptions {
  tokens: number;
  window: RateLimitWindow;
  keyPrefix: string;
}

export interface RateLimitOptions extends RateLimiterOptions {
  key: RateLimitKey;
  errorMessage?: string;
}

export interface LimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export type RateLimitCircuitStatus = 'closed' | 'open' | 'half-open';
export type RateLimitCircuitReason = 'quota' | 'transient';

export interface RateLimitCircuitSnapshot {
  state: RateLimitCircuitStatus;
  reason?: RateLimitCircuitReason;
  retryAt?: number;
}

interface InternalCircuitState {
  state: RateLimitCircuitStatus;
  reason: RateLimitCircuitReason | null;
  retryAt: number | null;
}

const TRANSIENT_COOLDOWN_MS = 5_000;
const QUOTA_COOLDOWN_MS = 30 * 60_000;
const REDIS_LIMIT_TIMEOUT_MS = 1_000;
let circuitState: InternalCircuitState = { state: 'closed', reason: null, retryAt: null };

export function getRateLimitCircuitState(): RateLimitCircuitSnapshot {
  return {
    state: circuitState.state,
    ...(circuitState.reason !== null ? { reason: circuitState.reason } : {}),
    ...(circuitState.retryAt !== null ? { retryAt: circuitState.retryAt } : {}),
  };
}

export function resetRateLimitCircuitState(): void {
  circuitState = { state: 'closed', reason: null, retryAt: null };
}

function transitionCircuit(next: InternalCircuitState, error?: unknown): void {
  const from = circuitState.state;
  circuitState = next;
  const context = {
    from,
    to: next.state,
    ...(next.reason !== null ? { reason: next.reason } : {}),
    ...(next.retryAt !== null ? { retryAt: next.retryAt } : {}),
    ...(error !== undefined ? { err: error } : {}),
  };
  if (next.state === 'open') {
    log.warn(context, 'Redis rate limiter circuit opened; using local memory buckets');
  } else {
    log.info(context, 'Redis rate limiter circuit transitioned');
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function numericProperty(value: unknown, key: string): number | null {
  if (!isRecord(value)) return null;
  const candidate = value[key];
  return typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : null;
}

function absoluteTimestamp(value: number, now: number): number | null {
  const timestamp = value < 1_000_000_000_000 ? value * 1000 : value;
  return timestamp > now ? timestamp : null;
}

function quotaRetryAt(error: unknown, message: string, now: number): number {
  const explicitReset = numericProperty(error, 'reset') ?? numericProperty(error, 'retryAt');
  if (explicitReset !== null) {
    const timestamp = absoluteTimestamp(explicitReset, now);
    if (timestamp !== null) return timestamp;
  }

  const retryAfter = numericProperty(error, 'retryAfter');
  if (retryAfter !== null && retryAfter > 0) return now + retryAfter * 1000;

  const timestampMatch = message.match(/(?:reset|retry[- ]?at)[^\d]*(\d{10,13})/i);
  const timestampRaw = timestampMatch?.[1];
  if (timestampRaw !== undefined) {
    const timestamp = absoluteTimestamp(Number(timestampRaw), now);
    if (timestamp !== null) return timestamp;
  }
  return now + QUOTA_COOLDOWN_MS;
}

function openCircuit(error: unknown): void {
  const now = Date.now();
  const message = error instanceof Error ? error.message : String(error);
  const status = numericProperty(error, 'status') ?? numericProperty(error, 'statusCode');
  const quota = status === 429
    || /quota|daily requests? limit|requests? limit exceeded|usage limit|too many requests|\b429\b/i.test(message);
  const reason: RateLimitCircuitReason = quota ? 'quota' : 'transient';
  const retryAt = quota ? quotaRetryAt(error, message, now) : now + TRANSIENT_COOLDOWN_MS;
  transitionCircuit({ state: 'open', reason, retryAt }, error);
}

function claimRedisProbe(): boolean {
  if (circuitState.state === 'closed') return true;
  if (circuitState.state === 'half-open' || circuitState.retryAt === null) return false;
  if (Date.now() < circuitState.retryAt) return false;
  transitionCircuit({ ...circuitState, state: 'half-open' });
  return true;
}

function closeCircuit(): void {
  if (circuitState.state === 'closed') return;
  transitionCircuit({ state: 'closed', reason: null, retryAt: null });
}

const memoryBuckets = new Map<string, { count: number; reset: number }>();
const MEMORY_BUCKET_SWEEP_MS = 60_000;

const memoryBucketSweeper = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryBuckets.entries()) {
    if (entry.reset <= now) {
      memoryBuckets.delete(key);
    }
  }
}, MEMORY_BUCKET_SWEEP_MS);

if (typeof memoryBucketSweeper === 'object' && 'unref' in memoryBucketSweeper) {
  memoryBucketSweeper.unref();
}

export function resetMemoryBuckets(): void {
  memoryBuckets.clear();
}

function shouldBypassDevAuthLimits(): boolean {
  return process.env['NODE_ENV'] !== 'production' && process.env['DEV_SKIP_OTP'] === 'true';
}

function getClientIp(c: Context): string {
  const xForwardedFor = c.req.header('x-forwarded-for') ?? '';
  const firstForwardedIp = xForwardedFor.split(',')[0]?.trim() ?? '';
  return firstForwardedIp || c.req.header('x-real-ip') || '127.0.0.1';
}
function getUserId(c: Context): string | null {
  const variables: unknown = c.var;
  const user = isRecord(variables) ? variables['user'] : null;
  return isRecord(user) && typeof user['id'] === 'string' ? user['id'] : null;
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
function createLimiter(options: RateLimiterOptions) {
  const profiledTokens = applyProfile(options.tokens);
  if (!Number.isFinite(profiledTokens)) return null;

  return upstashRedis
    ? new Ratelimit({
        redis: upstashRedis,
        limiter: Ratelimit.slidingWindow(profiledTokens, options.window),
        analytics: true,
        timeout: REDIS_LIMIT_TIMEOUT_MS,
        prefix: `ratelimit:${options.keyPrefix}`,
      })
    : null;
}

export function createRateLimiter(options: RateLimiterOptions): {
  limit: (identity: string) => Promise<LimitResult>;
} {
  const profiledTokens = applyProfile(options.tokens);
  if (!Number.isFinite(profiledTokens)) {
    return {
      limit: () => Promise.resolve({
        success: true,
        limit: Number.MAX_SAFE_INTEGER,
        remaining: Number.MAX_SAFE_INTEGER,
        reset: 0,
      }),
    };
  }
  const limiter = createLimiter(options);

  return {
    async limit(identity: string): Promise<LimitResult> {
      const storageKey = `${options.keyPrefix}:${identity}`;
      if (limiter && claimRedisProbe()) {
        try {
          const remoteResult = await limiter.limit(identity);
          if (remoteResult.reason === 'timeout') {
            openCircuit(new Error('Upstash rate limiter timed out'));
            return memoryLimit(storageKey, profiledTokens, options.window);
          }
          closeCircuit();
          return remoteResult;
        } catch (error: unknown) {
          openCircuit(error);
          return memoryLimit(storageKey, profiledTokens, options.window);
        }
      }

      if (!limiter && circuitState.state === 'closed') {
        transitionCircuit(
          { state: 'open', reason: 'transient', retryAt: null },
          new Error('Redis rate limiter is not configured'),
        );
      }
      return memoryLimit(storageKey, profiledTokens, options.window);
    },
  };
}

export function createRateLimit(options: RateLimitOptions) {
  const profiledTokens = applyProfile(options.tokens);
  const rateLimiter = createRateLimiter(options);

  return async function rateLimitMiddleware(c: Context, next: Next) {
    if (!Number.isFinite(profiledTokens)) {
      await next();
      return;
    }

    const identity = options.key === 'user'
      ? getUserId(c) ?? `ip:${getClientIp(c)}`
      : getClientIp(c);
    const result = await rateLimiter.limit(identity);

    c.header('X-RateLimit-Limit', result.limit.toString());
    c.header('X-RateLimit-Remaining', result.remaining.toString());
    c.header('X-RateLimit-Reset', Math.ceil(result.reset / 1000).toString());

    if (!result.success) {
      const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
      c.header('Retry-After', retryAfter.toString());
      return c.json({ error: options.errorMessage ?? 'Too many requests', code: 'RATE_LIMITED' }, 429);
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
  return ratelimit(c, next);
}

const ratelimitRegisto = createRateLimit({ tokens: 3, window: '1 h', keyPrefix: 'registo', key: 'ip' });

export async function rateLimitRegisto(c: Context, next: Next) {
  if (shouldBypassDevAuthLimits()) {
    await next();
    return;
  }
  return ratelimitRegisto(c, next);
}

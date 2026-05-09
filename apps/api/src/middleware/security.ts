import type { Context, Next } from 'hono';
import { env } from '../lib/env.js';

function originFromUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function buildCsp(): string {
  const scriptSrc = env.NODE_ENV === 'production'
    ? "script-src 'self'"
    : "script-src 'self' 'unsafe-inline'";
  const connectSrcItems: (string | null)[] = [
    "'self'",
    env.NODE_ENV !== 'production' ? 'https:' : null, // restrict wildcard in prod
    originFromUrl(env.R2_PUBLIC_URL),
    originFromUrl(env.SENTRY_DSN),
    originFromUrl(env.EDGE_PUBLIC_URL),
    originFromUrl(env.UPSTASH_REDIS_REST_URL),
  ];
  const connectSrc = new Set(connectSrcItems.filter((v): v is string => typeof v === 'string'));

  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    `connect-src ${Array.from(connectSrc).join(' ')}`,
    "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
    "frame-ancestors 'none'",
  ].join('; ');
}

export async function securityMiddleware(c: Context, next: Next) {
  await next();

  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  c.header('Content-Security-Policy', buildCsp());
  if (env.NODE_ENV === 'production') {
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
}

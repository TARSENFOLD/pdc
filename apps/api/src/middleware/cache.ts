import type { Context, Next } from 'hono';

/**
 * Default API cache policy — no-store for authenticated endpoints.
 * Applied globally, overridden per-route where needed.
 */
export async function noStoreCache(c: Context, next: Next) {
  await next();
  // Only set if no Cache-Control already set by the route handler
  if (!c.res.headers.get('Cache-Control')) {
    c.header('Cache-Control', 'no-store');
  }
}

/**
 * Public catalogue cache — stale-while-revalidate for public listings.
 * Apply to /catalogo routes.
 */
export async function publicCache(maxAge = 60, swr = 300) {
  return async (c: Context, next: Next) => {
    await next();
    c.header('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=${swr}`);
  };
}

/**
 * Factory: returns middleware that sets public cache headers.
 */
export function withPublicCache(maxAge = 60, swr = 300) {
  return async (c: Context, next: Next) => {
    await next();
    c.header('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=${swr}`);
  };
}

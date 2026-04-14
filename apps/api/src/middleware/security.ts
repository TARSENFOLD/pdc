import type { Context, Next } from 'hono';

/**
 * Middleware de segurança — aplica headers HTTP defensivos.
 * CORS é tratado pelo cors() do Hono em index.ts.
 * Deve ser registado antes de todas as rotas.
 */
export async function securityMiddleware(c: Context, next: Next) {
  await next();

  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );
}

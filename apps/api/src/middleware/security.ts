import type { Context, Next } from 'hono';

const ALLOWED_ORIGIN = process.env['FRONTEND_URL'] ?? 'http://localhost:5173';

/**
 * Middleware de segurança — aplica headers HTTP defensivos e validação de origem.
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

  // Reforça CORS — apenas permite a origem configurada
  const origin = c.req.header('Origin');
  if (origin !== undefined && origin === ALLOWED_ORIGIN) {
    c.header('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    c.header('Vary', 'Origin');
  }
}

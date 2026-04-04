import type { Context, Next } from 'hono';
import type { AuthVariables } from '../modules/auth/auth.middleware.js';
import { strapiPost } from '../modules/strapi/strapi.client.js';

/**
 * Factory de middleware de auditoria.
 * Regista a acção no Strapi após o handler ser executado com sucesso (2xx).
 *
 * @example
 * route.put('/:id/resolver', verifyJwt, checkRole([...]), auditLog('denuncia_resolver'), handler)
 */
export function auditLog(accao: string) {
  return async (c: Context<{ Variables: AuthVariables }>, next: Next) => {
    await next();

    // Só regista se a resposta foi bem-sucedida
    if (c.res.status < 200 || c.res.status >= 300) return;

    const user = c.get('user');
    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
      c.req.header('x-real-ip') ??
      'unknown';

    // Registo assíncrono — não bloqueia a resposta
    strapiPost('/audit-logs', {
      userId: user.id,
      accao,
      recurso: new URL(c.req.url).pathname,
      ip,
      timestamp: new Date().toISOString(),
    }).catch((err: unknown) => {
      console.error('[auditLog] falha ao registar:', err);
    });
  };
}

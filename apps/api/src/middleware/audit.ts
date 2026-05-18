import type { Context, Next } from 'hono';
import pino from 'pino';
import crypto from 'node:crypto';

const log = pino({ name: 'audit-mw' });
import type { AuthVariables } from '../modules/auth/auth.middleware.js';
import { strapiPost } from '../modules/strapi/strapi.client.js';

interface AuditActor {
  id: string;
  role: string;
}

interface AuditLogInput {
  actor: AuditActor;
  accao: string;
  recurso: string;
  ip: string;
  userAgent?: string | undefined;
  detalhes?: Record<string, unknown>;
}

function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex');
}

export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  await strapiPost('/audit-logs', {
    acao: input.accao,
    actorId: input.actor.id,
    actorRole: input.actor.role,
    detalhes: {
      recurso: input.recurso,
      ...(input.detalhes ?? {}),
    },
    ipHash: hashIp(input.ip),
    ...(input.userAgent ? { userAgent: input.userAgent } : {}),
    serverTimestamp: new Date().toISOString(),
  });
}

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
    writeAuditLog({
      actor: user,
      accao,
      recurso: new URL(c.req.url).pathname,
      ip,
      userAgent: c.req.header('user-agent'),
    }).catch((err: unknown) => {
      log.error({ err }, '[auditLog] falha ao registar');
    });
  };
}

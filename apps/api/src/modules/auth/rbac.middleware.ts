import type { Context, Next } from 'hono';
import type { Role } from '@pdc/shared';
import type { AuthVariables } from './auth.middleware.js';
import pino from 'pino';

const log = pino({ name: 'rbac' });

export function checkRole(allowedRoles: Role[]) {
  return async (c: Context<{ Variables: AuthVariables }>, next: Next) => {
    const user = c.get('user');

    if (!allowedRoles.includes(user.role)) {
      log.warn({ userId: user.id, role: user.role, allowedRoles, path: c.req.path }, 'RBAC denied');
      return c.json({ error: 'Forbidden — Insufficient permissions' }, 403);
    }

    await next();
  };
}

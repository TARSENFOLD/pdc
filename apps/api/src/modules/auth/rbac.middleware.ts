import type { Context, Next } from 'hono';
import type { Role } from '@pdc/shared';
import type { AuthVariables } from './auth.middleware.js';

export function checkRole(allowedRoles: Role[]) {
  return async (c: Context<{ Variables: AuthVariables }>, next: Next) => {
    const user = c.get('user');

    if (!allowedRoles.includes(user.role)) {
      return c.json({ error: 'Forbidden — Insufficient permissions' }, 403);
    }

    await next();
  };
}

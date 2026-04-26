import type { Context, Next } from 'hono';
import type { Role } from '@pdc/shared';
import type { AuthVariables } from './auth.middleware.js';

export function checkRole(allowedRoles: Role[]) {
  return async (c: Context<{ Variables: AuthVariables }>, next: Next) => {
    const user = c.get('user');
    
    // Suporte a apelidos/legado durante a migração (estudante <-> estudante)
    const canonicalRoles = allowedRoles.map(r => r === 'estudante' ? 'estudante' : r as string);
    const userRole = user.role === 'estudante' ? 'estudante' : user.role;

    if (!canonicalRoles.includes(userRole)) {
      return c.json({ error: 'Forbidden — Insufficient permissions' }, 403);
    }

    await next();
  };
}

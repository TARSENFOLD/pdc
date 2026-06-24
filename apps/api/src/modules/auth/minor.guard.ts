import type { Context, MiddlewareHandler, Next } from 'hono';
import type { AuthVariables } from './auth.middleware.js';

function isMinorUser(c: Context<{ Variables: AuthVariables }>): boolean {
  const user = c.get('user');
  return user.isMinor === true || user.estadoMenoridade === 'menor';
}

export function requireAdult(): MiddlewareHandler<{ Variables: AuthVariables }> {
  return async (c: Context<{ Variables: AuthVariables }>, next: Next) => {
    if (isMinorUser(c)) {
      return c.json({ error: 'Esta ação requer utilizador adulto.' }, 403);
    }
    await next();
  };
}

export function denyContactToMinor(): MiddlewareHandler<{ Variables: AuthVariables }> {
  return async (c: Context<{ Variables: AuthVariables }>, next: Next) => {
    if (isMinorUser(c)) {
      return c.json({ error: 'Contacto direto com menores requer fluxo autorizado.' }, 403);
    }
    await next();
  };
}

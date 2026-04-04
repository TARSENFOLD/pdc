import { jwtVerify } from 'jose';
import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import type { Role } from '@pdc/shared';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'change-me-in-production-min-32-chars'
);

export interface AuthVariables {
  user: {
    id: string;
    role: Role;
  };
}

export async function verifyJwt(c: Context<{ Variables: AuthVariables }>, next: Next) {
  const token = getCookie(c, 'access_token');

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    c.set('user', {
      id: payload.sub as string,
      role: payload.role as Role,
    });
    await next();
  } catch {
    return c.json({ error: 'Unauthorized' }, 401);
  }
}

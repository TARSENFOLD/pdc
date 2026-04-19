import { jwtVerify } from 'jose';
import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import type { Role } from '@pdc/shared';
import { env } from '../../lib/env.js';


const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET);

export interface AuthVariables {
  user: {
    id: string;
    role: Role;
    instituicaoId?: string | undefined;
  };
}

export async function verifyJwt(c: Context<{ Variables: AuthVariables }>, next: Next) {
  const token = getCookie(c, 'access_token');

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    const user: AuthVariables['user'] = {
      id: payload.sub as string,
      role: payload.role as Role,
      instituicaoId: payload.instituicaoId as string | undefined,
    };

    c.set('user', user);
    await next();
  } catch {
    return c.json({ error: 'Unauthorized' }, 401);
  }
}

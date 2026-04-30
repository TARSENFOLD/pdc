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
    perfilId?: string | undefined;
    instituicaoId?: number | undefined;
  };
}

export interface OptionalAuthVariables {
  user?: {
    id: string;
    role: Role;
    perfilId?: string | undefined;
    instituicaoId?: number | undefined;
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
      perfilId: payload.perfilId as string | undefined,
      instituicaoId: payload.instituicaoId ? parseInt(payload.instituicaoId as string, 10) : undefined,
    };

    c.set('user', user);
    await next();
  } catch {
    return c.json({ error: 'Unauthorized' }, 401);
  }
}

export async function optionalJwt(c: Context<{ Variables: OptionalAuthVariables }>, next: Next) {
  const token = getCookie(c, 'access_token');
  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      c.set('user', {
        id: payload.sub as string,
        role: payload.role as Role,
        perfilId: payload.perfilId as string | undefined,
        instituicaoId: payload.instituicaoId ? parseInt(payload.instituicaoId as string, 10) : undefined,
      });
    } catch {
      // Invalid token — proceed as anonymous
    }
  }
  await next();
}

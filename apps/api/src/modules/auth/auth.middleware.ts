import { jwtVerify } from 'jose';
import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { RoleSchema, type Role } from '@pdc/shared';
import { z } from 'zod';
import { env } from '../../lib/env.js';


const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET);

export const JwtUserPayloadSchema = z.object({
  sub: z.string().min(1),
  role: RoleSchema,
  perfilId: z.string().min(1).optional(),
  instituicaoId: z.union([z.string().min(1), z.number().int()]).optional()
    .transform((value) => (value === undefined ? undefined : Number(value)))
    .pipe(z.number().int().positive().optional()),
});

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
    const payloadResult = JwtUserPayloadSchema.safeParse(payload);
    if (!payloadResult.success) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const parsedPayload = payloadResult.data;

    const user: AuthVariables['user'] = {
      id: parsedPayload.sub,
      role: parsedPayload.role,
      perfilId: parsedPayload.perfilId,
      instituicaoId: parsedPayload.instituicaoId,
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
      const payloadResult = JwtUserPayloadSchema.safeParse(payload);
      if (payloadResult.success) {
        const parsedPayload = payloadResult.data;
        c.set('user', {
          id: parsedPayload.sub,
          role: parsedPayload.role,
          perfilId: parsedPayload.perfilId,
          instituicaoId: parsedPayload.instituicaoId,
        });
      }
    } catch {
      // Invalid token — proceed as anonymous
    }
  }
  await next();
}

import { jwtVerify } from 'jose';
import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { RoleSchema, type Role } from '@pdc/shared';
import { z } from 'zod';
import { env } from '../../lib/env.js';


const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET);

function isAuthBypassPath(path: string): boolean {
  return path.startsWith('/auth/') || path.startsWith('/finalizar/') || path.startsWith('/media/');
}

export const JwtUserPayloadSchema = z.object({
  sub: z.string().min(1),
  role: RoleSchema,
  perfilId: z.string().min(1).optional(),
  instituicaoId: z.union([z.string().min(1), z.number().int()]).optional()
    .transform((value) => (value === undefined ? undefined : Number(value)))
    .pipe(z.number().int().positive().optional()),
  onboardingCompleto: z.boolean().nullish(),
  isMinor: z.boolean().optional(),
  estadoMenoridade: z.enum(['pendente', 'adulto', 'menor']).optional(),
  consentimentoEstado: z.enum(['pendente', 'completo', 'requer_reconsentimento', 'bloqueado']).optional(),
});

function hasExplicitComplianceBlock(payload: z.infer<typeof JwtUserPayloadSchema>): boolean {
  return payload.consentimentoEstado === 'pendente'
    || payload.consentimentoEstado === 'requer_reconsentimento'
    || payload.consentimentoEstado === 'bloqueado'
    || payload.estadoMenoridade === 'pendente';
}

export interface AuthVariables {
  user: {
    id: string;
    role: Role;
    perfilId?: string | undefined;
    instituicaoId?: number | undefined;
    onboardingCompleto?: boolean | undefined;
    isMinor?: boolean | undefined;
    estadoMenoridade?: 'pendente' | 'adulto' | 'menor' | undefined;
    consentimentoEstado?: 'pendente' | 'completo' | 'requer_reconsentimento' | 'bloqueado' | undefined;
  };
}

export interface OptionalAuthVariables {
  user?: {
    id: string;
    role: Role;
    perfilId?: string | undefined;
    instituicaoId?: number | undefined;
    onboardingCompleto?: boolean | undefined;
    isMinor?: boolean | undefined;
    estadoMenoridade?: 'pendente' | 'adulto' | 'menor' | undefined;
    consentimentoEstado?: 'pendente' | 'completo' | 'requer_reconsentimento' | 'bloqueado' | undefined;
  };
}

export async function verifyJwt(c: Context<{ Variables: AuthVariables }>, next: Next) {
  const token = getCookie(c, 'access_token');

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  let parsedPayload: z.infer<typeof JwtUserPayloadSchema>;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const payloadResult = JwtUserPayloadSchema.safeParse(payload);
    if (!payloadResult.success) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    parsedPayload = payloadResult.data;
  } catch {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const user: AuthVariables['user'] = {
    id: parsedPayload.sub,
    role: parsedPayload.role,
    perfilId: parsedPayload.perfilId,
    instituicaoId: parsedPayload.instituicaoId,
    onboardingCompleto: parsedPayload.onboardingCompleto ?? undefined,
    isMinor: parsedPayload.isMinor,
    estadoMenoridade: parsedPayload.estadoMenoridade,
    consentimentoEstado: parsedPayload.consentimentoEstado,
  };

  c.set('user', user);

  // Block incomplete OAuth sessions from all routes except auth, finalizar, and media upload
  if (parsedPayload.onboardingCompleto === false) {
    const path = c.req.path;
    if (!isAuthBypassPath(path)) {
      return c.json({ error: 'Onboarding incompleto' }, 403);
    }
  }

  if (hasExplicitComplianceBlock(parsedPayload) && !isAuthBypassPath(c.req.path)) {
    return c.json({ error: 'Regularização legal obrigatória' }, 403);
  }

  await next();
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
          isMinor: parsedPayload.isMinor,
          estadoMenoridade: parsedPayload.estadoMenoridade,
          consentimentoEstado: parsedPayload.consentimentoEstado,
        });
      }
    } catch {
      // Invalid token — proceed as anonymous
    }
  }
  await next();
}

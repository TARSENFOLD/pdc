import { jwtVerify } from 'jose';
import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { RoleSchema, type Role } from '@pdc/shared';
import { z } from 'zod';
import { env } from '../../lib/env.js';
import { ACCESS_TOKEN_COOKIE } from './auth.constants.js';
import { authSessionService } from './auth-session.service.js';
import { setSentryUser } from '../../middleware/sentry.js';

const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET);

function isAuthBypassPath(path: string): boolean {
  return path.startsWith('/auth/') || path.startsWith('/finalizar/') || path.startsWith('/media/');
}

export const JwtUserPayloadSchema = z.object({
  sub: z.string().min(1),
  role: RoleSchema,
  perfilId: z.string().min(1).optional(),
  instituicaoId: z
    .union([z.string().min(1), z.number().int()])
    .optional()
    .transform((value) => (value === undefined ? undefined : Number(value)))
    .pipe(z.number().int().positive().optional()),
  onboardingCompleto: z.boolean().nullish(),
  isMinor: z.boolean().optional(),
  estadoMenoridade: z.enum(['pendente', 'adulto', 'menor']).optional(),
  consentimentoEstado: z
    .enum(['pendente', 'completo', 'requer_reconsentimento', 'bloqueado'])
    .optional(),
  ver: z.number().int().nonnegative().default(0),
});

function hasExplicitComplianceBlock(payload: z.infer<typeof JwtUserPayloadSchema>): boolean {
  return (
    payload.consentimentoEstado === 'pendente' ||
    payload.consentimentoEstado === 'requer_reconsentimento' ||
    payload.consentimentoEstado === 'bloqueado' ||
    payload.estadoMenoridade === 'pendente'
  );
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
    consentimentoEstado?:
      | 'pendente'
      | 'completo'
      | 'requer_reconsentimento'
      | 'bloqueado'
      | undefined;
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
    consentimentoEstado?:
      | 'pendente'
      | 'completo'
      | 'requer_reconsentimento'
      | 'bloqueado'
      | undefined;
  };
}

function bindAuthenticatedUser(
  setUser: (user: AuthVariables['user']) => void,
  user: AuthVariables['user']
): void {
  setUser(user);
  setSentryUser(user.id);
}

export async function verifyAccessJwt(
  token: string
): Promise<z.infer<typeof JwtUserPayloadSchema> | null> {
  let parsedPayload: z.infer<typeof JwtUserPayloadSchema>;
  try {
    const { payload, protectedHeader } = await jwtVerify(token, JWT_SECRET);
    if (protectedHeader.typ !== 'access') return null;
    const payloadResult = JwtUserPayloadSchema.safeParse(payload);
    if (!payloadResult.success) return null;
    parsedPayload = payloadResult.data;
  } catch {
    return null;
  }
  return (await authSessionService.isAccessTokenCurrent(parsedPayload.sub, parsedPayload.ver))
    ? parsedPayload
    : null;
}

export async function verifyJwt(c: Context<{ Variables: AuthVariables }>, next: Next) {
  const token = getCookie(c, ACCESS_TOKEN_COOKIE);

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  let parsedPayload: Awaited<ReturnType<typeof verifyAccessJwt>>;
  try {
    parsedPayload = await verifyAccessJwt(token);
  } catch {
    return c.json({ error: 'Serviço de sessão temporariamente indisponível' }, 503);
  }
  if (!parsedPayload) {
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

  bindAuthenticatedUser((authenticatedUser) => {
    c.set('user', authenticatedUser);
  }, user);

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
  const token = getCookie(c, ACCESS_TOKEN_COOKIE);
  if (token) {
    let parsedPayload: Awaited<ReturnType<typeof verifyAccessJwt>> = null;
    try {
      parsedPayload = await verifyAccessJwt(token);
    } catch {
      await next();
      return;
    }
    if (parsedPayload) {
      const user: NonNullable<OptionalAuthVariables['user']> = {
        id: parsedPayload.sub,
        role: parsedPayload.role,
        perfilId: parsedPayload.perfilId,
        instituicaoId: parsedPayload.instituicaoId,
        onboardingCompleto: parsedPayload.onboardingCompleto ?? undefined,
        isMinor: parsedPayload.isMinor,
        estadoMenoridade: parsedPayload.estadoMenoridade,
        consentimentoEstado: parsedPayload.consentimentoEstado,
      };
      bindAuthenticatedUser((authenticatedUser) => {
        c.set('user', authenticatedUser);
      }, user);
    }
  }
  await next();
}

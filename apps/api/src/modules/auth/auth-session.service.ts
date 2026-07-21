import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import type { User } from '@pdc/shared';
import { SignJWT, jwtVerify } from 'jose';
import { z } from 'zod';
import { env } from '../../lib/env.js';
import { redis } from '../../lib/redis.js';
import pino from 'pino';
import {
  ACCESS_TOKEN_TTL,
  AUTH_REVOCATION_BATCH_SIZE,
  SESSION_TTL_SECONDS,
} from './auth.constants.js';
import { RefreshTokenReuseError } from './auth-session.errors.js';

const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET);
const log = pino({ name: 'auth-session-service' });
const RefreshPayloadSchema = z.object({
  sub: z.string().min(1),
  sid: z.string().uuid(),
  exp: z.number().int().positive(),
});

export interface AuthSessionTokens {
  accessToken: string;
  refreshToken: string;
  refreshMaxAgeSeconds: number;
}

export interface VerifiedRefreshSession {
  userId: string;
  sessionId: string;
  expiresAt: number;
}

const ROTATE_SESSION_SCRIPT = `
local current = redis.call("GET", KEYS[1])
if not current then
  redis.call("SREM", KEYS[2], KEYS[1])
  if redis.call("SCARD", KEYS[2]) == 0 then redis.call("DEL", KEYS[2]) end
  return 0
end
if current ~= ARGV[1] then
  redis.call("DEL", KEYS[1])
  redis.call("SREM", KEYS[2], KEYS[1])
  if redis.call("SCARD", KEYS[2]) == 0 then redis.call("DEL", KEYS[2]) end
  return -1
end
redis.call("SET", KEYS[1], ARGV[2], "EX", ARGV[3])
return 1
`;
const ISSUE_SESSION_SCRIPT = `
redis.call("SET", KEYS[1], ARGV[1], "EX", ARGV[2])
redis.call("SADD", KEYS[2], KEYS[1])
redis.call("EXPIRE", KEYS[2], ARGV[2])
return 1
`;
const REVOKE_SESSION_SCRIPT = `
redis.call("DEL", KEYS[1])
redis.call("SREM", KEYS[2], KEYS[1])
if redis.call("SCARD", KEYS[2]) == 0 then redis.call("DEL", KEYS[2]) end
return 1
`;
const REVOKE_SESSION_BATCH_SCRIPT = `
local sessions = redis.call("SPOP", KEYS[1], ARGV[1])
if not sessions then return {0, 0} end
for _, sessionKey in ipairs(sessions) do redis.call("DEL", sessionKey) end
local remaining = redis.call("SCARD", KEYS[1])
if remaining == 0 then redis.call("DEL", KEYS[1]) end
return {#sessions, remaining}
`;
const RevocationBatchSchema = z.tuple([
  z.number().int().nonnegative(),
  z.number().int().nonnegative(),
]);

function sessionKey(sessionId: string): string {
  return `refresh_session:${sessionId}`;
}

function userSessionsKey(userId: string): string {
  return `user_sessions:${userId}`;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function hashesMatch(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function accessClaims(user: User): Record<string, unknown> {
  const claims: Record<string, unknown> = { sub: user.id, role: user.role };
  if (user.perfilId) claims.perfilId = user.perfilId;
  if (user.onboardingCompleto != null) claims.onboardingCompleto = user.onboardingCompleto;
  if (user.estadoMenoridade != null) claims.estadoMenoridade = user.estadoMenoridade;
  if (user.consentimentoEstado != null) claims.consentimentoEstado = user.consentimentoEstado;
  if (user.isMinor != null) claims.isMinor = user.isMinor;
  return claims;
}

async function signSessionTokens(
  user: User,
  sessionId: string,
  expiresAt: number,
): Promise<AuthSessionTokens> {
  const refreshMaxAgeSeconds = expiresAt - Math.floor(Date.now() / 1_000);
  if (refreshMaxAgeSeconds <= 0) {
    throw new Error('Sessão expirada');
  }
  const accessToken = await new SignJWT(accessClaims(user))
    .setProtectedHeader({ alg: 'HS256', typ: 'access' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(JWT_SECRET);
  const refreshToken = await new SignJWT({ sub: user.id, sid: sessionId })
    .setProtectedHeader({ alg: 'HS256', typ: 'refresh' })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .setJti(randomUUID())
    .sign(JWT_SECRET);
  return { accessToken, refreshToken, refreshMaxAgeSeconds };
}

async function verifySignedRefresh(token: string): Promise<VerifiedRefreshSession | null> {
  try {
    const { payload, protectedHeader } = await jwtVerify(token, JWT_SECRET);
    if (protectedHeader.typ !== 'refresh') return null;
    const parsed = RefreshPayloadSchema.safeParse(payload);
    if (!parsed.success || parsed.data.exp <= Math.floor(Date.now() / 1_000)) return null;
    return {
      userId: parsed.data.sub,
      sessionId: parsed.data.sid,
      expiresAt: parsed.data.exp,
    };
  } catch {
    return null;
  }
}

export const authSessionService = {
  async issue(user: User): Promise<AuthSessionTokens> {
    const sessionId = randomUUID();
    const expiresAt = Math.floor(Date.now() / 1_000) + SESSION_TTL_SECONDS;
    const tokens = await signSessionTokens(user, sessionId, expiresAt);
    const stored = await redis.eval<number>(
      ISSUE_SESSION_SCRIPT,
      [sessionKey(sessionId), userSessionsKey(user.id)],
      [hashToken(tokens.refreshToken), tokens.refreshMaxAgeSeconds],
    );
    if (stored !== 1) throw new Error('Falha ao persistir sessão');
    return tokens;
  },

  async verify(token: string): Promise<VerifiedRefreshSession | null> {
    const session = await verifySignedRefresh(token);
    if (!session) return null;
    const key = sessionKey(session.sessionId);
    const currentHash = await redis.get<string>(key);
    if (!currentHash) return null;
    if (!hashesMatch(currentHash, hashToken(token))) {
      await redis.eval<number>(
        REVOKE_SESSION_SCRIPT,
        [key, userSessionsKey(session.userId)],
        [],
      );
      return null;
    }
    return session;
  },

  async rotate(token: string, user: User): Promise<AuthSessionTokens | null> {
    const session = await verifySignedRefresh(token);
    if (!session || session.userId !== user.id) return null;
    const tokens = await signSessionTokens(user, session.sessionId, session.expiresAt);
    const result = await redis.eval<number>(
      ROTATE_SESSION_SCRIPT,
      [sessionKey(session.sessionId), userSessionsKey(session.userId)],
      [hashToken(token), hashToken(tokens.refreshToken), tokens.refreshMaxAgeSeconds],
    );
    if (result === -1) {
      log.warn(
        { userId: session.userId, sessionId: session.sessionId },
        'Reutilização de refresh token detetada; sessão revogada',
      );
      throw new RefreshTokenReuseError();
    }
    return result === 1 ? tokens : null;
  },

  async revoke(token: string): Promise<string | null> {
    const session = await verifySignedRefresh(token);
    if (!session) return null;
    await redis.eval<number>(
      REVOKE_SESSION_SCRIPT,
      [sessionKey(session.sessionId), userSessionsKey(session.userId)],
      [],
    );
    return session.userId;
  },

  async revokeAll(userId: string): Promise<number> {
    let revoked = 0;
    for (;;) {
      const result = RevocationBatchSchema.parse(await redis.eval(
        REVOKE_SESSION_BATCH_SCRIPT,
        [userSessionsKey(userId)],
        [AUTH_REVOCATION_BATCH_SIZE],
      ));
      revoked += result[0];
      if (result[1] === 0) return revoked;
      if (result[0] === 0) throw new Error('Revogação de sessões não progrediu');
    }
  },
};

import { createHash, randomUUID } from 'node:crypto';
import type { User } from '@pdc/shared';
import { SignJWT, jwtVerify } from 'jose';
import { z } from 'zod';
import { env } from '../../lib/env.js';
import { redis } from '../../lib/redis.js';
import pino from 'pino';
import {
  ACCESS_TOKEN_TTL,
  AUTH_RESET_LOCK_TTL_SECONDS,
  AUTH_REVOCATION_BATCH_SIZE,
  REFRESH_ROTATION_REPLAY_TTL_SECONDS,
  SESSION_TTL_SECONDS,
} from './auth.constants.js';
import { RefreshTokenReuseError } from './auth-session.errors.js';

const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET);
const log = pino({ name: 'auth-session-service' });
const RefreshPayloadSchema = z.object({
  sub: z.string().min(1),
  sid: z.string().uuid(),
  exp: z.number().int().positive(),
  iat: z.number().int().nonnegative(),
  jti: z.string().min(1).optional(),
  ver: z.number().int().nonnegative().default(0),
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
  issuedAt: number;
  authEpoch: number;
}

const ROTATE_SESSION_SCRIPT = `
local current = redis.call("GET", KEYS[1])
if not current then
  redis.call("ZREM", KEYS[2], KEYS[1])
  redis.call("SREM", KEYS[4], KEYS[1])
  if redis.call("ZCARD", KEYS[2]) == 0 then redis.call("DEL", KEYS[2]) end
  if redis.call("SCARD", KEYS[4]) == 0 then redis.call("DEL", KEYS[4]) end
  return 0
end
if current ~= ARGV[1] then
  local replay = redis.call("GET", KEYS[3])
  if replay == current and replay == ARGV[2] then return 2 end
  redis.call("DEL", KEYS[1])
  redis.call("ZREM", KEYS[2], KEYS[1])
  redis.call("SREM", KEYS[4], KEYS[1])
  if redis.call("ZCARD", KEYS[2]) == 0 then redis.call("DEL", KEYS[2]) end
  if redis.call("SCARD", KEYS[4]) == 0 then redis.call("DEL", KEYS[4]) end
  return -1
end
redis.call("SET", KEYS[1], ARGV[2], "EX", ARGV[3])
redis.call("SET", KEYS[3], ARGV[2], "EX", ARGV[4])
return 1
`;
const VERIFY_SESSION_SCRIPT = `
local current = redis.call("GET", KEYS[1])
if not current then
  redis.call("ZREM", KEYS[2], KEYS[1])
  redis.call("SREM", KEYS[4], KEYS[1])
  if redis.call("ZCARD", KEYS[2]) == 0 then redis.call("DEL", KEYS[2]) end
  if redis.call("SCARD", KEYS[4]) == 0 then redis.call("DEL", KEYS[4]) end
  return 0
end
if current == ARGV[1] then return 1 end
local replay = redis.call("GET", KEYS[3])
if replay == current then return 2 end
redis.call("DEL", KEYS[1])
redis.call("ZREM", KEYS[2], KEYS[1])
redis.call("SREM", KEYS[4], KEYS[1])
if redis.call("ZCARD", KEYS[2]) == 0 then redis.call("DEL", KEYS[2]) end
if redis.call("SCARD", KEYS[4]) == 0 then redis.call("DEL", KEYS[4]) end
return -1
`;
const ISSUE_SESSION_SCRIPT = `
if redis.call("EXISTS", KEYS[4]) == 1 then return -1 end
local epoch = tonumber(redis.call("GET", KEYS[3]) or "0")
if epoch ~= tonumber(ARGV[3]) then return -2 end
redis.call("SET", KEYS[1], ARGV[1], "EX", ARGV[2])
redis.call("ZREMRANGEBYSCORE", KEYS[2], "-inf", ARGV[4])
redis.call("ZADD", KEYS[2], ARGV[5], KEYS[1])
redis.call("EXPIRE", KEYS[2], ARGV[2])
return 1
`;
const REVOKE_SESSION_SCRIPT = `
local current = redis.call("GET", KEYS[1])
if not current or current ~= ARGV[1] then return 0 end
redis.call("DEL", KEYS[1])
redis.call("ZREM", KEYS[2], KEYS[1])
redis.call("SREM", KEYS[3], KEYS[1])
if redis.call("ZCARD", KEYS[2]) == 0 then redis.call("DEL", KEYS[2]) end
if redis.call("SCARD", KEYS[3]) == 0 then redis.call("DEL", KEYS[3]) end
return 1
`;
const BEGIN_GLOBAL_REVOCATION_SCRIPT = `
local acquired = redis.call("SET", KEYS[2], ARGV[1], "EX", ARGV[2], "NX")
if not acquired then return -1 end
return redis.call("INCR", KEYS[1])
`;
const END_GLOBAL_REVOCATION_SCRIPT = `
if redis.call("GET", KEYS[1]) ~= ARGV[1] then return 0 end
return redis.call("DEL", KEYS[1])
`;
const RENEW_GLOBAL_REVOCATION_SCRIPT = `
if redis.call("GET", KEYS[1]) ~= ARGV[1] then return 0 end
return redis.call("EXPIRE", KEYS[1], ARGV[2])
`;
const REVOKE_SESSION_BATCH_SCRIPT = `
local sessions = redis.call("ZRANGE", KEYS[1], 0, tonumber(ARGV[1]) - 1)
if #sessions == 0 then return {0, 0} end
for _, sessionKey in ipairs(sessions) do
  redis.call("DEL", sessionKey)
  redis.call("ZREM", KEYS[1], sessionKey)
end
local remaining = redis.call("ZCARD", KEYS[1])
if remaining == 0 then redis.call("DEL", KEYS[1]) end
return {#sessions, remaining}
`;
const REVOKE_LEGACY_SESSION_BATCH_SCRIPT = `
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
  return `user_sessions_v2:${userId}`;
}

function legacyUserSessionsKey(userId: string): string {
  return `user_sessions:${userId}`;
}

function authEpochKey(userId: string): string {
  return `auth_epoch:${userId}`;
}

function authResetLockKey(userId: string): string {
  return `auth_reset_lock:${userId}`;
}

function rotationReplayKey(sessionId: string, tokenHash: string): string {
  return `refresh_replay:${sessionId}:${tokenHash}`;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function accessClaims(user: User, authEpoch: number): Record<string, unknown> {
  const claims: Record<string, unknown> = { sub: user.id, role: user.role, ver: authEpoch };
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
  authEpoch: number,
  refreshIssuedAt = Math.floor(Date.now() / 1_000),
  refreshTokenId: string = randomUUID(),
): Promise<AuthSessionTokens> {
  const refreshMaxAgeSeconds = expiresAt - Math.floor(Date.now() / 1_000);
  if (refreshMaxAgeSeconds <= 0) {
    throw new Error('Sessão expirada');
  }
  const accessToken = await new SignJWT(accessClaims(user, authEpoch))
    .setProtectedHeader({ alg: 'HS256', typ: 'access' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(JWT_SECRET);
  const refreshToken = await new SignJWT({ sub: user.id, sid: sessionId, ver: authEpoch })
    .setProtectedHeader({ alg: 'HS256', typ: 'refresh' })
    .setIssuedAt(refreshIssuedAt)
    .setExpirationTime(expiresAt)
    .setJti(refreshTokenId)
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
      issuedAt: parsed.data.iat,
      authEpoch: parsed.data.ver,
    };
  } catch {
    return null;
  }
}

const AuthEpochSchema = z.coerce.number().int().nonnegative();

async function getAuthEpoch(userId: string): Promise<number> {
  const stored = await redis.get<string | number>(authEpochKey(userId));
  if (stored == null) return 0;
  return AuthEpochSchema.parse(stored);
}

async function isEpochCurrent(userId: string, authEpoch: number): Promise<boolean> {
  const [currentEpoch, resetLock] = await Promise.all([
    getAuthEpoch(userId),
    redis.get<string>(authResetLockKey(userId)),
  ]);
  return resetLock === null && currentEpoch === authEpoch;
}

async function renewGlobalRevocationLock(userId: string, lockId: string): Promise<void> {
  const renewed = await redis.eval<number>(
    RENEW_GLOBAL_REVOCATION_SCRIPT,
    [authResetLockKey(userId)],
    [lockId, AUTH_RESET_LOCK_TTL_SECONDS],
  );
  if (renewed !== 1) throw new Error('Lock de revogação global expirou ou mudou de proprietário');
}

export const authSessionService = {
  async issue(user: User): Promise<AuthSessionTokens> {
    const sessionId = randomUUID();
    const expiresAt = Math.floor(Date.now() / 1_000) + SESSION_TTL_SECONDS;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const authEpoch = await getAuthEpoch(user.id);
      const tokens = await signSessionTokens(user, sessionId, expiresAt, authEpoch);
      const stored = await redis.eval<number>(
        ISSUE_SESSION_SCRIPT,
        [
          sessionKey(sessionId),
          userSessionsKey(user.id),
          authEpochKey(user.id),
          authResetLockKey(user.id),
        ],
        [
          hashToken(tokens.refreshToken),
          tokens.refreshMaxAgeSeconds,
          authEpoch,
          Math.floor(Date.now() / 1_000),
          expiresAt,
        ],
      );
      if (stored === 1) return tokens;
      if (stored === -1) throw new Error('Autenticação bloqueada durante redefinição de palavra-passe');
    }
    throw new Error('Época de autenticação mudou durante a emissão da sessão');
  },

  async verify(token: string): Promise<VerifiedRefreshSession | null> {
    const session = await verifySignedRefresh(token);
    if (!session) return null;
    if (!await isEpochCurrent(session.userId, session.authEpoch)) return null;
    const key = sessionKey(session.sessionId);
    const tokenHash = hashToken(token);
    const result = await redis.eval<number>(
      VERIFY_SESSION_SCRIPT,
      [
        key,
        userSessionsKey(session.userId),
        rotationReplayKey(session.sessionId, tokenHash),
        legacyUserSessionsKey(session.userId),
      ],
      [tokenHash],
    );
    return result === 1 || result === 2 ? session : null;
  },

  async rotate(token: string, user: User): Promise<AuthSessionTokens | null> {
    const session = await verifySignedRefresh(token);
    if (!session || session.userId !== user.id) return null;
    if (!await isEpochCurrent(session.userId, session.authEpoch)) return null;
    const oldHash = hashToken(token);
    const tokens = await signSessionTokens(
      user,
      session.sessionId,
      session.expiresAt,
      session.authEpoch,
      session.issuedAt,
      createHash('sha256').update(`rotation:${token}`).digest('hex'),
    );
    const result = await redis.eval<number>(
      ROTATE_SESSION_SCRIPT,
      [
        sessionKey(session.sessionId),
        userSessionsKey(session.userId),
        rotationReplayKey(session.sessionId, oldHash),
        legacyUserSessionsKey(session.userId),
      ],
      [
        oldHash,
        hashToken(tokens.refreshToken),
        tokens.refreshMaxAgeSeconds,
        REFRESH_ROTATION_REPLAY_TTL_SECONDS,
      ],
    );
    if (result === -1) {
      log.warn(
        { userId: session.userId, sessionId: session.sessionId },
        'Reutilização de refresh token detetada; sessão revogada',
      );
      throw new RefreshTokenReuseError();
    }
    return result === 1 || result === 2 ? tokens : null;
  },

  async revoke(token: string): Promise<string | null> {
    const session = await verifySignedRefresh(token);
    if (!session) return null;
    if (!await isEpochCurrent(session.userId, session.authEpoch)) return null;
    const revoked = await redis.eval<number>(
      REVOKE_SESSION_SCRIPT,
      [
        sessionKey(session.sessionId),
        userSessionsKey(session.userId),
        legacyUserSessionsKey(session.userId),
      ],
      [hashToken(token)],
    );
    return revoked === 1 ? session.userId : null;
  },

  isAccessTokenCurrent(userId: string, authEpoch: number): Promise<boolean> {
    return isEpochCurrent(userId, authEpoch);
  },

  async beginGlobalRevocation(userId: string): Promise<string> {
    const lockId = randomUUID();
    const epoch = await redis.eval<number>(
      BEGIN_GLOBAL_REVOCATION_SCRIPT,
      [authEpochKey(userId), authResetLockKey(userId)],
      [lockId, AUTH_RESET_LOCK_TTL_SECONDS],
    );
    if (epoch < 0) throw new Error('Revogação global já está em curso');
    return lockId;
  },

  async endGlobalRevocation(userId: string, lockId: string): Promise<void> {
    const released = await redis.eval<number>(
      END_GLOBAL_REVOCATION_SCRIPT,
      [authResetLockKey(userId)],
      [lockId],
    );
    if (released !== 1) throw new Error('Lock de revogação global não pôde ser libertado');
  },

  renewGlobalRevocation(userId: string, lockId: string): Promise<void> {
    return renewGlobalRevocationLock(userId, lockId);
  },

  async revokeAll(userId: string, lockId?: string): Promise<number> {
    let revoked = 0;
    const indexes = [
      { key: userSessionsKey(userId), script: REVOKE_SESSION_BATCH_SCRIPT },
      { key: legacyUserSessionsKey(userId), script: REVOKE_LEGACY_SESSION_BATCH_SCRIPT },
    ];
    for (const index of indexes) {
      for (;;) {
        if (lockId) await renewGlobalRevocationLock(userId, lockId);
        const result = RevocationBatchSchema.parse(await redis.eval(
          index.script,
          [index.key],
          [AUTH_REVOCATION_BATCH_SIZE],
        ));
        revoked += result[0];
        if (result[1] === 0) break;
        if (result[0] === 0) throw new Error('Revogação de sessões não progrediu');
      }
    }
    return revoked;
  },
};

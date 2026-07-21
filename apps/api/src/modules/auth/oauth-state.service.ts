import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { env } from '../../lib/env.js';
import { hasPrimaryRedis, redis } from '../../lib/redis.js';

const OAUTH_STATE_TTL_SECONDS = 600;

function signOAuthStatePayload(payload: string): string {
  return createHmac('sha256', env.JWT_SECRET).update(payload).digest('base64url');
}

function valuesMatch(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  return expectedBuffer.length === actualBuffer.length
    && timingSafeEqual(expectedBuffer, actualBuffer);
}

function isValidSignedState(state: string | undefined): state is string {
  if (!state) return false;
  const parts = state.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') return false;

  const [, nonce, issuedAtRaw, signature] = parts;
  if (!nonce || !issuedAtRaw || !signature) return false;

  const issuedAt = Number.parseInt(issuedAtRaw, 10);
  if (!Number.isFinite(issuedAt)) return false;

  const now = Math.floor(Date.now() / 1_000);
  if (issuedAt > now + 30 || now - issuedAt > OAUTH_STATE_TTL_SECONDS) return false;

  return valuesMatch(signOAuthStatePayload(`${nonce}.${issuedAtRaw}`), signature);
}

export const oauthStateService = {
  ttlSeconds: OAUTH_STATE_TTL_SECONDS,

  async issue(): Promise<string> {
    if (!hasPrimaryRedis) {
      throw new Error('OAuth state requer Redis primário');
    }
    const nonce = randomUUID();
    const issuedAt = Math.floor(Date.now() / 1_000).toString();
    const payload = `${nonce}.${issuedAt}`;
    const state = `v1.${payload}.${signOAuthStatePayload(payload)}`;
    const stored = await redis.set(`oauth_state:${state}`, 'true', {
      ex: OAUTH_STATE_TTL_SECONDS,
    });
    if (stored !== 'OK') throw new Error('Falha ao persistir OAuth state');
    return state;
  },

  async consume(state: string | undefined, browserState: string | undefined): Promise<boolean> {
    if (!isValidSignedState(state) || !browserState || !valuesMatch(browserState, state)) {
      return false;
    }
    if (!hasPrimaryRedis) throw new Error('OAuth state requer Redis primário');
    const consumed = await redis.eval<number>(
      'local value = redis.call("GET", KEYS[1]); if not value then return 0 end; redis.call("DEL", KEYS[1]); return 1',
      [`oauth_state:${state}`],
      [],
    );
    return consumed === 1;
  },
};

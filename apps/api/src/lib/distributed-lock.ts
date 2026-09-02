/**
 * distributed-lock.ts
 *
 * SET NX EX + fencing token (via Redis INCR counter).
 *
 * Decision rationale (ADR-XXX): Upstash Redis is single-node managed.
 * RedLock requires 3+ independent Redis nodes for quorum — not applicable here.
 * We use SET NX EX with an atomic fencing token to prevent stale lock writes.
 * Limitation: split-brain on Redis failover is accepted for current scale.
 * Monitoring via structured pino logs on expiry / contention.
 */

import pino from 'pino';
import { redis } from './redis.js';

const log = pino({ name: 'distributed-lock' });

export interface LockHandle {
  key: string;
  fencingToken: number;
  extend: (ttlMs: number) => Promise<boolean>;
  release: () => Promise<boolean>;
}

const FENCE_PREFIX = 'lock:fence:';
const EXTEND_IF_OWNER_SCRIPT = `
  if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('EXPIRE', KEYS[1], ARGV[2])
  end
  return 0
`;
const RELEASE_IF_OWNER_SCRIPT = `
  if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('DEL', KEYS[1])
  end
  return 0
`;

export async function acquireLock(key: string, ttlMs: number): Promise<LockHandle | null> {
  const fenceKey = `${FENCE_PREFIX}${key}`;

  const fencingToken = await redis.incr(fenceKey).catch((err: unknown) => {
    log.error({ err, key }, 'Falha ao incrementar fencing token');
    return null;
  });

  if (fencingToken === null) return null;

  const ttlSeconds = Math.ceil(ttlMs / 1000);
  const value = `lock:${String(fencingToken)}`;

  const acquired = await redis.set(key, value, { nx: true, ex: ttlSeconds });

  if (!acquired) {
    log.debug({ key }, 'Lock não adquirido — já detido por outro processo');
    return null;
  }

  log.debug({ key, fencingToken, ttlMs }, 'Lock adquirido');

  return {
    key,
    fencingToken,
    extend: async (extensionTtlMs: number) => {
      const extensionSeconds = Math.ceil(extensionTtlMs / 1000);
      try {
        const extended = await redis.eval(
          EXTEND_IF_OWNER_SCRIPT,
          [key],
          [value, extensionSeconds],
        );
        if (extended === 1) {
          log.debug({ key, fencingToken, extensionTtlMs }, 'Lock renovado');
          return true;
        }
        log.warn({ key, fencingToken }, 'Lock já não pertence ao detentor durante renovação');
        return false;
      } catch (err) {
        log.error({ err, key }, 'Erro ao renovar lock');
        throw err;
      }
    },
    release: async () => {
      let released: number;
      try {
        const result = await redis.eval(RELEASE_IF_OWNER_SCRIPT, [key], [value]);
        released = result === 1 ? 1 : 0;
      } catch (err) {
        log.error({ err, key }, 'Erro ao libertar lock');
        throw err;
      }
      if (released === 1) {
        log.debug({ key, fencingToken }, 'Lock libertado');
        return true;
      }
      log.warn(
        { key, fencingToken },
        'Lock já não pertence ao detentor no release (TTL expirado ou reaquisição) — escrita stale prevenida',
      );
      return false;
    },
  };
}

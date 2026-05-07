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
  release: () => Promise<void>;
}

const FENCE_PREFIX = 'lock:fence:';

export async function acquireLock(key: string, ttlMs: number): Promise<LockHandle | null> {
  const fenceKey = `${FENCE_PREFIX}${key}`;

  const fencingToken = await redis.incr(fenceKey).catch((err: unknown) => {
    log.error({ err, key }, 'Falha ao incrementar fencing token');
    return null;
  });

  if (fencingToken === null) return null;

  const ttlSeconds = Math.ceil(ttlMs / 1000);
  const value = String(fencingToken);

  const acquired = await redis.set(key, value, { nx: true, ex: ttlSeconds });

  if (!acquired) {
    log.debug({ key }, 'Lock não adquirido — já detido por outro processo');
    return null;
  }

  log.debug({ key, fencingToken, ttlMs }, 'Lock adquirido');

  return {
    key,
    fencingToken,
    release: async () => {
      try {
        const current = await redis.get<string>(key);
        if (current === value) {
          await redis.del(key);
          log.debug({ key, fencingToken }, 'Lock libertado');
        } else {
          log.warn(
            { key, fencingToken, current },
            'Lock TTL expirou antes do release — stale lock write prevenido pelo fencing token',
          );
        }
      } catch (err) {
        log.error({ err, key }, 'Erro ao libertar lock');
      }
    },
  };
}

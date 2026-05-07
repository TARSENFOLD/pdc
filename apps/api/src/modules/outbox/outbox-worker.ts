import pino from 'pino';
import { replayUnprocessedEvents } from '../events/outbox-replay.js';
import { acquireLock } from '../../lib/distributed-lock.js';

const log = pino({ name: 'outbox-worker' });

const LOCK_KEY = 'outbox:worker:lock';
const LOCK_TTL_MS = 90_000;
const INTERVAL = 60_000;

/**
 * Outbox Worker (G15-T9)
 * Processo isolado para replay de eventos com lock distribuído + fencing token.
 * Ver: apps/api/src/lib/distributed-lock.ts e ADR-XXX-distributed-locking.md
 */
async function startWorker() {
  log.info('Outbox Worker Daemon iniciado');

  for (;;) {
    try {
      const lock = await acquireLock(LOCK_KEY, LOCK_TTL_MS);

      if (lock) {
        log.debug({ fencingToken: lock.fencingToken }, 'Lock adquirido, a processar outbox...');
        try {
          await replayUnprocessedEvents();
        } finally {
          await lock.release();
        }
      } else {
        log.debug('Outro worker já está a processar, a aguardar...');
      }

    } catch (err: unknown) {
      log.error({ err }, 'Erro no loop do Outbox Worker');
    }

    await new Promise(resolve => setTimeout(resolve, INTERVAL));
  }
}

startWorker().catch((err: unknown) => {
  log.fatal({ err }, 'Falha crítica no Outbox Worker');
  process.exit(1);
});

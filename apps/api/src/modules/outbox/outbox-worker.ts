import pino from 'pino';
import { replayUnprocessedEvents } from '../events/outbox-replay.js';
import { acquireLock } from '../../lib/distributed-lock.js';

const log = pino({ name: 'outbox-worker' });

export const OUTBOX_WORKER_LOCK_KEY = 'outbox:worker:lock';
export const OUTBOX_WORKER_LOCK_TTL_MS = 90_000;
export const OUTBOX_WORKER_INTERVAL_MS = 60_000;
const OUTBOX_WORKER_LOCK_RENEW_INTERVAL_MS = OUTBOX_WORKER_LOCK_TTL_MS / 3;

export interface OutboxWorkerIterationResult {
  processed: boolean;
  fencingToken?: number;
}

export async function runOutboxWorkerOnce(): Promise<OutboxWorkerIterationResult> {
  const lock = await acquireLock(OUTBOX_WORKER_LOCK_KEY, OUTBOX_WORKER_LOCK_TTL_MS);

  if (!lock) {
    log.debug('Outro worker já está a processar, a aguardar...');
    return { processed: false };
  }

  log.debug({ fencingToken: lock.fencingToken }, 'Lock adquirido, a processar outbox...');
  let renewal: Promise<void> | undefined;
  const renewLease = (): Promise<void> => {
    if (!renewal) {
      renewal = lock.extend(OUTBOX_WORKER_LOCK_TTL_MS)
        .then((extended) => {
          if (!extended) {
            log.warn({ fencingToken: lock.fencingToken }, 'Lease do Outbox Worker perdido durante replay');
          }
        })
        .catch((err: unknown) => {
          log.error({ err, fencingToken: lock.fencingToken }, 'Falha ao renovar lease do Outbox Worker');
        })
        .finally(() => {
          renewal = undefined;
        });
    }
    return renewal;
  };
  const renewalTimer = setInterval(() => {
    void renewLease();
  }, OUTBOX_WORKER_LOCK_RENEW_INTERVAL_MS);
  renewalTimer.unref();

  try {
    await replayUnprocessedEvents();
    return { processed: true, fencingToken: lock.fencingToken };
  } finally {
    clearInterval(renewalTimer);
    if (renewal) await renewal;
    try {
      const released = await lock.release();
      if (!released) {
        log.warn({ fencingToken: lock.fencingToken }, 'Lease do Outbox Worker expirou antes do release');
      }
    } catch (releaseErr) {
      log.error({ err: releaseErr }, 'Falha ao libertar lock do Outbox Worker');
    }
  }
}

export interface OutboxWorkerController {
  stop(): void;
  isStopped(): boolean;
  onStop(cb: () => void): () => void;
}

export function createOutboxWorkerController(): OutboxWorkerController {
  let stopped = false;
  const listeners: Array<() => void> = [];
  return {
    stop() {
      if (stopped) return;
      stopped = true;
      listeners.splice(0).forEach((cb) => {
        try {
          cb();
        } catch (err) {
          log.error({ err }, 'Erro num listener onStop do Outbox Worker');
        }
      });
    },
    isStopped() { return stopped; },
    onStop(cb) {
      if (stopped) {
        cb();
        return () => {};
      }
      listeners.push(cb);
      return () => {
        const idx = listeners.indexOf(cb);
        if (idx !== -1) listeners.splice(idx, 1);
      };
    },
  };
}

function wait(ms: number, controller: OutboxWorkerController): Promise<void> {
  return new Promise((resolve) => {
    let unsubscribe = () => {};
    const timer = setTimeout(() => { unsubscribe(); resolve(); }, ms);
    unsubscribe = controller.onStop(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}

/**
 * Outbox Worker (G15-T9)
 * Processo isolado para replay de eventos com lock distribuído + fencing token.
 * Ver: apps/api/src/lib/distributed-lock.ts e docs/decisoes/adr-050-distributed-locking.md
 */
export async function startOutboxWorker(intervalMs = OUTBOX_WORKER_INTERVAL_MS, controller = createOutboxWorkerController()): Promise<void> {
  log.info('Outbox Worker Daemon iniciado');

  while (!controller.isStopped()) {
    try {
      await runOutboxWorkerOnce();
    } catch (err: unknown) {
      log.error({ err }, 'Erro no loop do Outbox Worker');
    }

    if (!controller.isStopped()) await wait(intervalMs, controller);
  }

  log.info('Outbox Worker Daemon parado graciosamente');
}

const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === `file://${entrypoint}`) {
  const controller = createOutboxWorkerController();
  const stop = () => { controller.stop(); };
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);

  // Watchdog: se uma iteração travar (ex: lock ou DB pendente), força saída após 15s de sinal.
  const WATCHDOG_MS = 15_000;
  const watchdog = (signal: string) => {
    setTimeout(() => {
      log.fatal({ signal }, 'Outbox Worker não parou graciosamente dentro do prazo; forçando exit');
      process.exit(1);
    }, WATCHDOG_MS).unref();
  };
  process.once('SIGTERM', () => { watchdog('SIGTERM'); });
  process.once('SIGINT', () => { watchdog('SIGINT'); });

  startOutboxWorker(OUTBOX_WORKER_INTERVAL_MS, controller).catch((err: unknown) => {
    log.fatal({ err }, 'Falha crítica no Outbox Worker');
    process.exit(1);
  });
}

import pino from 'pino';
import { redis } from '../../lib/redis.js';
import { replayUnprocessedEvents } from '../events/outbox-replay.js';

const log = pino({ name: 'outbox-worker' });

const LOCK_KEY = 'outbox:worker:lock';
const LOCK_TTL = 90; // 90 segundos
const INTERVAL = 60000; // 1 minuto

/**
 * Outbox Worker (G15-T9)
 * Processo isolado para replay de eventos com lock distribuído.
 */
async function startWorker() {
  log.info('Outbox Worker Daemon iniciado');

  while (true) {
    try {
      // 1. Tentar adquirir lock
      const acquired = await redis.set(LOCK_KEY, 'locked', { 
        ex: LOCK_TTL, 
        nx: true 
      });

      if (acquired) {
        log.debug('Lock adquirido, a processar outbox...');
        
        await replayUnprocessedEvents();

        // 2. Libertar lock (opcional, ou esperar TTL)
        // await redis.del(LOCK_KEY);
      } else {
        log.debug('Outro worker já está a processar, a aguardar...');
      }

    } catch (err) {
      log.error({ err }, 'Erro no loop do Outbox Worker');
    }

    // 3. Esperar próximo ciclo
    await new Promise(resolve => setTimeout(resolve, INTERVAL));
  }
}

startWorker().catch(err => {
  log.fatal({ err }, 'Falha crítica no Outbox Worker');
  process.exit(1);
});

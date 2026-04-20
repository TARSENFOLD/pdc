import pino from 'pino';
import { redis } from '../../lib/redis.js';
import { strapiPost } from '../strapi/strapi.client.js';
import { telemetriaProcessor } from './telemetria.processor.js';
import type { TelemetriaEvento } from '@pdc/shared';
import { applySanityRules, BFF_SANITY_RULES } from '@pdc/shared';
import { uploadToR2 } from '../media/r2.service.js';

const log = pino({ name: 'telemetry-consumer' });

const QUEUE_KEY = 'telemetry_queue';
const IDEMPOTENCY_PREFIX = 'seen_event_ids:';
const LOCK_PREFIX = 'lock:telemetry:';
const DLQ_KEY = 'telemetry_dlq';
const TTL_7_DAYS = 7 * 24 * 60 * 60;

// Identificador único para este worker para gerir in-flight queues
const WORKER_ID = crypto.randomUUID();
const PROCESSING_QUEUE = `telemetry_queue:processing:${WORKER_ID}`;

async function acquireLock(eventId: string): Promise<boolean> {
  const lockKey = `${LOCK_PREFIX}${eventId}`;
  const acquired = await redis.set(lockKey, '1', { nx: true, px: 10000 }); // 10s lock
  return acquired === 'OK';
}

async function releaseLock(eventId: string) {
  await redis.del(`${LOCK_PREFIX}${eventId}`);
}

async function moveToColdStorage(event: TelemetriaEvento, reason: string) {
  const key = `cold-storage/telemetry/${new Date().toISOString().split('T')[0]}/${event.eventId}.json`;
  const payload = JSON.stringify({ ...event, invalidReason: reason });
  await uploadToR2(key, Buffer.from(payload), 'application/json').catch(err => {
    log.error({ err, eventId: event.eventId }, 'Falha ao mover para Cold Storage');
  });
}
export async function processEvent(eventRaw: string) {
  const event = JSON.parse(eventRaw) as TelemetriaEvento & { perfilId?: string; metadata?: any };

  if (!event.eventId) return;

  // 1. RedLock: Garantir exclusividade absoluta
  const hasLock = await acquireLock(event.eventId);
  if (!hasLock) return;

  try {
    // 2. Idempotência Matemática (SET NX EX)
    // Previne o Bug do Midnight Rollover e garante limpeza automática em 7 dias
    const idempKey = `${IDEMPOTENCY_PREFIX}${event.eventId}`;
    const isNew = await redis.set(idempKey, '1', { nx: true, ex: TTL_7_DAYS });
    if (isNew !== 'OK') return;

    // 3. Auditoria Forense (Camada 1 - Edge & Camada 2 - BFF)
    const edgeInvalid = event.metadata?.edgeInvalidated;
    const bffSanity = applySanityRules(event, BFF_SANITY_RULES);

    if (edgeInvalid || !bffSanity.valid) {
      const reason = edgeInvalid ? `Edge: ${event.metadata?.edgeReason}` : bffSanity.reason;
      log.warn({ eventId: event.eventId, reason }, 'Mover para Cold Storage (Compliance Audit)');
      await moveToColdStorage(event, reason || 'Invalid behavior detected');

      // Sucesso Forense: Remover da In-Flight Queue sem poluir o Postgres
      await redis.lrem(PROCESSING_QUEUE, 1, eventRaw);
      return;
    }

    // 4. Persistência Strapi (Apenas dados limpos de mérito)
    await strapiPost('/telemetrias', {
...

      eventId: event.eventId,
      tipo: event.tipo,
      dados: event.payload,
      clientTimestamp: event.timestamp,
      perfil: event.perfilId,
    });

    // 5. Heurísticas
    if (event.perfilId && event.tipo.startsWith('simulacao.')) {
      await telemetriaProcessor.processUserDomain(event.perfilId, 'simulacao').catch(err => {
        log.error({ err }, 'Heuristics Error');
      });
    }

    // Sucesso: Remover da In-Flight Queue
    await redis.lrem(PROCESSING_QUEUE, 1, eventRaw);
  } catch (err: unknown) {
    log.error({ err, eventId: event.eventId }, 'Erro no processamento. Mover para DLQ.');
    await redis.lpush(DLQ_KEY, eventRaw);
    await redis.lrem(PROCESSING_QUEUE, 1, eventRaw);
  } finally {
    await releaseLock(event.eventId);
  }
}

export async function startConsumer() {
  log.info({ workerId: WORKER_ID }, 'Iniciando Reliable Consumer (Sovereign Ingestion)');

  while (true) {
    try {
      // RPOPLPUSH: Move atomicamente da fila principal para a fila de processamento deste worker
      const result = await redis.rpoplpush<string>(QUEUE_KEY, PROCESSING_QUEUE);
      
      if (result) {
        await processEvent(result);
      } else {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (err) {
      log.error({ err }, 'Erro na Upstash Queue');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

if (import.meta.url === `file://${process.argv[1] ?? ''}`) {
  startConsumer().catch(err => {
    log.fatal({ err }, 'Falha Fatal no Worker');
    process.exit(1);
  });
}

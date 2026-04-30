import pino from 'pino';
import { redis } from '../../lib/redis.js';
import { strapiPost } from '../strapi/strapi.client.js';
import { 
  applySanityRules, 
  BFF_SANITY_RULES, 
  type TelemetriaEvento,
  type ColdStorageEvent,
} from '@pdc/shared';
import { telemetriaProcessor } from './telemetria.processor.js';
import { uploadColdBatch } from '../../lib/r2.js';

const log = pino({ name: 'telemetry-consumer' });

const QUEUE_KEY = 'telemetry_queue';
const PROCESSING_QUEUE = 'telemetry_processing_queue';
const COLD_BUFFER_MAX = 100;
const COLD_FLUSH_INTERVAL_MS = 60_000;

const coldBuffer: ColdStorageEvent[] = [];

async function flushColdBuffer(): Promise<void> {
  if (coldBuffer.length === 0) return;
  const batch = coldBuffer.splice(0, coldBuffer.length);
  await uploadColdBatch(batch).catch((err: unknown) => {
    log.error({ err }, 'Erro ao fazer flush do cold buffer para R2');
  });
}

setInterval(() => {
  void flushColdBuffer();
}, COLD_FLUSH_INTERVAL_MS);

function moveToColdStorage(event: TelemetriaEvento, reason: string): void {
  const coldEvent: ColdStorageEvent = {
    eventId: event.eventId,
    tipo: event.tipo,
    payload: event.payload,
    timestamp: event.timestamp,
    invalidReason: reason,
    layer: 'bff',
    archivedAt: new Date().toISOString(),
  };
  coldBuffer.push(coldEvent);
  if (coldBuffer.length >= COLD_BUFFER_MAX) {
    void flushColdBuffer();
  }
}

const CHUNK_SIZE = 100;
let processedInChunk = 0;

export async function processTelemetryQueue() {
  for (;;) {
    let eventRaw: string | null = null;

    processedInChunk++;
    if (processedInChunk >= CHUNK_SIZE) {
      processedInChunk = 0;
      await new Promise<void>((resolve) => setImmediate(resolve));
    }

    try {
      const queueLen = await redis.llen(QUEUE_KEY).catch(() => 0);
      if (queueLen > 10_000) {
        log.warn({ queueLen }, 'Queue acima de 10k eventos — backpressure activo');
      }

      // 1. RPOPLPUSH (Atómico - Garantia contra crash)
      eventRaw = await redis.rpoplpush<string>(QUEUE_KEY, PROCESSING_QUEUE);
      
      if (!eventRaw) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }

      const event = JSON.parse(eventRaw) as TelemetriaEvento;
      const eventId = event.eventId;

      // 2. Idempotência Soberana (G15/B4)
      // Resolve D6 (Midnight Rollover) usando TTL de 7 dias per eventId (SET NX EX)
      if (eventId) {
        const lockKey = `tel:evt:${eventId}`;
        const isNew = await redis.set(lockKey, '1', { nx: true, ex: 60 * 60 * 24 * 7 });
        
        if (!isNew) {
          log.warn({ eventId }, 'Evento duplicado detectado no Consumer (Sovereign Idempotency), ignorando');
          await redis.lrem(PROCESSING_QUEUE, 1, eventRaw);
          continue;
        }
      }

      // 3. Validação L2 (Heurísticas de Fraude)
      const sanity = applySanityRules(event, BFF_SANITY_RULES);

      if (!sanity.valid) {
        const reason = sanity.reason ?? 'Invalid behavior detected';
        log.warn({ eventId: event.eventId, reason }, 'Mover para Cold Storage (Compliance Audit)');
        moveToColdStorage(event, reason);

        // Sucesso Forense: Remover da In-Flight Queue sem poluir o Postgres
        await redis.lrem(PROCESSING_QUEUE, 1, eventRaw);
        continue;
      }

      // 3. Persistência Strapi (Apenas dados limpos de mérito)
      await strapiPost<unknown>('/telemetrias', {
        eventId: event.eventId,
        tipo: event.tipo,
        dados: event.payload,
        clientTimestamp: event.timestamp,
        perfil: event.perfilId,
      });

      // 4. Heurísticas
      const perfilId = event.perfilId;
      if (perfilId && event.tipo.startsWith('simulacao.')) {
        await telemetriaProcessor.processUserDomain(perfilId, 'simulacao').catch((err: unknown) => {
          log.error({ err }, 'Heuristics Error');
        });
      }

      // 5. ACK: Remover da fila de processamento
      await redis.lrem(PROCESSING_QUEUE, 1, eventRaw);

    } catch (err: unknown) {
      log.error({ err, eventRaw }, 'Erro fatal ao processar telemetria');
      // No caso de erro de persistência, mantemos no PROCESSING_QUEUE para retry manual
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
}

// Se invocado via CLI
const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === `file://${entrypoint}`) {
  processTelemetryQueue().catch((err: unknown) => {
    log.fatal({ err }, 'Consumer Terminado');
    process.exit(1);
  });
}

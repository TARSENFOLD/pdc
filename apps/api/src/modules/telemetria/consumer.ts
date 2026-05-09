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
import { handleLabEvent } from '../simulacoes/scoring/sim-2-3.engine.js';
import { incrementRetry, moveToDlq, clearRetries, RETRY_LIMIT } from './dlq.js';

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

export type TelemetryEventStatus = 'empty' | 'duplicate' | 'cold' | 'processed' | 'error';

// D-NC6: RPOPLPUSH → parse/process → persist → LREM. Never ACK before persist.
export async function processOneTelemetryEvent(): Promise<TelemetryEventStatus> {
  let eventRaw: string | null = null;

  try {
    const queueLen = await redis.llen(QUEUE_KEY).catch(() => 0);
    if (queueLen > 10_000) {
      log.warn({ queueLen }, 'Queue acima de 10k eventos — backpressure activo');
    }

    eventRaw = await redis.rpoplpush<string>(QUEUE_KEY, PROCESSING_QUEUE);

    if (!eventRaw) {
      return 'empty';
    }

    let event: TelemetriaEvento;
    try {
      event = JSON.parse(eventRaw) as TelemetriaEvento;
    } catch (parseErr: unknown) {
      log.error({ eventRaw }, 'Evento com JSON inválido — DLQ imediato');
      await moveToDlq(eventRaw, String(parseErr), 0);
      return 'error';
    }

    const eventId = event.eventId;

    if (eventId) {
      const lockKey = `tel:evt:${eventId}`;
      const isNew = await redis.set(lockKey, '1', { nx: true, ex: 60 * 60 * 24 * 7 });

      if (!isNew) {
        log.warn({ eventId }, 'Evento duplicado detectado no Consumer (Sovereign Idempotency), ignorando');
        await redis.lrem(PROCESSING_QUEUE, 1, eventRaw);
        return 'duplicate';
      }
    }

    const sanity = applySanityRules(event, BFF_SANITY_RULES);

    if (!sanity.valid) {
      const reason = sanity.reason ?? 'Invalid behavior detected';
      log.warn({ eventId: event.eventId, reason }, 'Mover para Cold Storage (Compliance Audit)');
      moveToColdStorage(event, reason);

      await redis.lrem(PROCESSING_QUEUE, 1, eventRaw);
      return 'cold';
    }

    // 4. Persistência Strapi (Apenas dados limpos de mérito)
    await strapiPost<unknown>('/telemetrias', {
      eventId: event.eventId,
      tipo: event.tipo,
      dados: event.payload,
      clientTimestamp: event.timestamp,
      perfil: event.perfilId,
    });

    // 5. Heurísticas
    const perfilId = event.perfilId;
    if (perfilId && event.tipo.startsWith('simulacao.')) {
      await telemetriaProcessor.processUserDomain(perfilId, 'simulacao').catch((err: unknown) => {
        log.error({ err }, 'Heuristics Error');
      });
    }

    // 5b. Scoring Tipo 2/3 (fire-and-forget — não bloqueia ACK; §7 Telemetria Sagrada)
    if (
      event.tipo === 'simulacao.lab.event' ||
      event.tipo === 'simulacao.lab.session.started' ||
      event.tipo === 'simulacao.lab.session.ended'
    ) {
      void handleLabEvent(event).catch((err: unknown) => {
        log.error({ err, eventId }, 'Erro no scoring Tipo 2/3');
      });
    }

    // 6. ACK: Remover da fila de processamento (persist-then-ACK)
    // clearRetries é bookkeeping não-essencial — falha aqui não deve re-enfileirar um evento já persistido
    if (eventId) {
      await clearRetries(eventId).catch((err: unknown) => {
        log.error({ err, eventId }, 'clearRetries falhou após persistência — ignorado');
      });
    }
    await redis.lrem(PROCESSING_QUEUE, 1, eventRaw);
    return 'processed';

  } catch (err: unknown) {
    log.error({ err, eventRaw }, 'Erro fatal ao processar telemetria');
    
    if (eventRaw) {
      try {
        const event = JSON.parse(eventRaw) as Partial<TelemetriaEvento>;
        const eventId = event.eventId;

        if (!eventId) {
          // Sem eventId não há rastreabilidade de retries, DLQ directo
          await moveToDlq(eventRaw, String(err), 0);
        } else {
          const retries = await incrementRetry(eventId); // TTL 7d per PE-T04

          if (retries >= RETRY_LIMIT) { // >= 5: DLQ no 5º retry (spec D-D6)
            await moveToDlq(eventRaw, String(err), retries, eventId);
          } else {
            // Transient error: libertar lock de idempotência e re-enfileirar
            await redis.del(`tel:evt:${eventId}`);
            await redis.lrem(PROCESSING_QUEUE, 1, eventRaw);
            await redis.lpush(QUEUE_KEY, eventRaw);
          }
        }
      } catch (innerErr: unknown) {
        log.error({ innerErr }, 'Erro no handler de retries — fallback DLQ');
        await moveToDlq(eventRaw, String(err), 0);
      }
    }

    return 'error';
  }
}

const CHUNK_SIZE = 100;
let processedInChunk = 0;

export async function processTelemetryQueue() {
  for (;;) {
    processedInChunk++;
    if (processedInChunk >= CHUNK_SIZE) {
      processedInChunk = 0;
      await new Promise<void>((resolve) => setImmediate(resolve));
    }

    const status = await processOneTelemetryEvent();

    if (status === 'empty') {
      await new Promise(resolve => setTimeout(resolve, 5000));
    } else if (status === 'error') {
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

import pino from 'pino';
import { redis } from '../../lib/redis.js';
import { strapiPost } from '../strapi/strapi.client.js';
import { 
  applySanityRules, 
  BFF_SANITY_RULES, 
  type TelemetriaEvento 
} from '@pdc/shared';
import { telemetriaProcessor } from './telemetria.processor.js';

const log = pino({ name: 'telemetry-consumer' });

const QUEUE_KEY = 'telemetry_queue';
const PROCESSING_QUEUE = 'telemetry_processing_queue';

function moveToColdStorage(event: TelemetriaEvento, reason: string) {
  // Simulação de S3/R2 Cold Storage
  log.info({ eventId: event.eventId, reason }, 'Evento movido para Cold Storage');
}

export async function processTelemetryQueue() {
  while (true) {
    let eventRaw: string | null = null;
    try {
      // 1. RPOPLPUSH (Atómico - Garantia contra crash)
      eventRaw = await redis.rpoplpush<string>(QUEUE_KEY, PROCESSING_QUEUE);
      
      if (!eventRaw) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }

      const event = JSON.parse(eventRaw) as TelemetriaEvento;
      const eventId = event.eventId;

      // 2. Idempotência Soberana (G15/B4)
      // Resolve D6 (Midnight Rollover) usando TTL de 7 dias
      if (eventId) {
        const lockKey = `tel:evt:${eventId}`;
        const isNew = await redis.sadd('idempotency:telemetry', lockKey);
        if (isNew === 0) {
          log.warn({ eventId }, 'Evento duplicado detectado no Consumer, ignorando');
          await redis.lrem(PROCESSING_QUEUE, 1, eventRaw);
          continue;
        }
        // Manter rasto por 7 dias
        await redis.expire(lockKey, 60 * 60 * 24 * 7);
      }

      // 3. Validação L2 (Heurísticas de Fraude)
      const sanity = applySanityRules(event, BFF_SANITY_RULES);

      if (!sanity.valid) {
        const reason = sanity.reason;
        log.warn({ eventId: event.eventId, reason }, 'Mover para Cold Storage (Compliance Audit)');
        await moveToColdStorage(event, reason || 'Invalid behavior detected');

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
        await telemetriaProcessor.processUserDomain(perfilId, 'simulacao').catch(err => {
          log.error({ err }, 'Heuristics Error');
        });
      }

      // 5. ACK: Remover da fila de processamento
      await redis.lrem(PROCESSING_QUEUE, 1, eventRaw);

    } catch (err) {
      log.error({ err, eventRaw }, 'Erro fatal ao processar telemetria');
      // No caso de erro de persistência, mantemos no PROCESSING_QUEUE para retry manual
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
}

// Se invocado via CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  processTelemetryQueue().catch(err => {
    log.fatal({ err }, 'Consumer Terminado');
    process.exit(1);
  });
}

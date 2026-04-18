import pino from 'pino';
import { redis } from '../../lib/redis.js';
import { strapiPost } from '../strapi/strapi.client.js';
import { telemetriaProcessor } from './telemetria.processor.js';
import type { TelemetriaEvento } from '@pdc/shared';
import { applySanityRules, BFF_SANITY_RULES } from '@pdc/shared';

const log = pino({ name: 'telemetry-consumer' });

const QUEUE_KEY = 'telemetry_queue';
const IDEMPOTENCY_PREFIX = 'seen_event_ids:';
const TTL_7_DAYS = 7 * 24 * 60 * 60; // segundos

export async function processEvent(eventRaw: string) {
  try {
    const event: TelemetriaEvento & { perfilId?: string } = JSON.parse(eventRaw);

    if (!event.eventId) {
      log.warn('Evento rejeitado: eventId ausente');
      return;
    }

    // 1. Idempotência Matemática
    const idempKey = `${IDEMPOTENCY_PREFIX}${event.eventId}`;
    const isNew = await redis.sadd(idempKey, '1');
    if (isNew === 0) {
      // Evento já existe (retry de cliente), descartar de forma segura
      return;
    }
    await redis.expire(idempKey, TTL_7_DAYS);

    // 1.5 Sanity full audit pre-persist (BFF layer)
    const sanity = applySanityRules(event, BFF_SANITY_RULES);
    let invalidated = false;
    if (!sanity.valid) {
      log.warn({ eventId: event.eventId, reason: sanity.reason, rule: sanity.ruleName }, 'Evento invalidado pelo Sanity BFF (Anti-cheat)');
      invalidated = true;
    }

    const securePayload = { 
      ...(event.payload || {}), 
      ...(invalidated ? { invalidated: true, sanityReason: sanity.reason } : {}) 
    };

    // 2. Persistência no Strapi
    await strapiPost('/telemetrias', {
      data: {
        eventId: event.eventId,
        tipo: event.tipo,
        payload: securePayload,
        clientTimestamp: event.timestamp,
        sessionId: (event as any).sessionId,
        url: (event as any).url,
        visibilityState: (event as any).visibilityState,
        perfil: event.perfilId,
      },
    });

    // 3. Heurísticas Eventuais
    // Ignorar eventos inválidos para o cálculo das heurísticas (anti-cheat blindado)
    if (!invalidated && event.perfilId && event.tipo.startsWith('simulacao.')) {
      // Background worker não bloqueia a ingestão do próximo
      telemetriaProcessor.processUserDomain(event.perfilId, 'simulacao').catch(err => {
        log.error({ err, perfilId: event.perfilId }, 'Falha na avaliação de Heurísticas Eventuais');
      });
    }
  } catch (err: unknown) {
    log.error({ err }, 'Erro ao processar item da queue');
    // Num sistema maduro re-enfileirava numa Dead Letter Queue (DLQ)
  }
}

export async function startConsumer() {
  log.info('Iniciando Consumer de Telemetria Edge (Long-Running Worker)');

  let isShuttingDown = false;
  const handleShutdown = () => {
    isShuttingDown = true;
    log.info('Desligando Consumer de Telemetria graciosamente...');
    process.exit(0);
  };

  process.on('SIGINT', handleShutdown);
  process.on('SIGTERM', handleShutdown);

  while (!isShuttingDown) {
    try {
      // Upstash REST não suporta BRPOP. Fazemos RPOP com delay manual em caso de miss.
      const result = await redis.rpop<string>(QUEUE_KEY);
      
      if (result) {
        await processEvent(result);
      } else {
        // Polling delay de 5s para não derreter o rate limit
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    } catch (err: unknown) {
      log.error({ err }, 'Erro na ligação à Upstash Queue');
      // Backoff para não asfixiar a rede
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

// Se foi invocado diretamente pela CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  startConsumer().catch(err => {
    log.fatal({ err }, 'Falha fatal no Worker');
    process.exit(1);
  });
}

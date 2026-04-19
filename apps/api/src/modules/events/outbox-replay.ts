import pino from 'pino';
import { strapiGet, strapiPut } from '../strapi/strapi.client.js';
import { eventBus } from './event-bus.js';

const log = pino({ name: 'outbox-replay' });

interface UnprocessedEvent {
  documentId: string;
  correlationId: string;
  name: string;
  payload: unknown;
  createdAt: string;
}

export async function replayUnprocessedEvents() {
  log.info('Iniciando script de Replay do Outbox Pattern...');

  try {
    // Fix: Generic type represents the item, client wraps in StrapiListResponse<T>
    const res = await strapiGet<UnprocessedEvent>('/domain-events', {
      'filters[processed][$eq]': 'false',
      'pagination[limit]': '100',
    });
    
    const events = res.data;
    if (!events || events.length === 0) {
      log.info('Nenhum evento pendente encontrado no Outbox.');
      return;
    }

    log.info(`Encontrados ${events.length} eventos pendentes para replay.`);

    for (const evt of events) {
      log.info({ eventId: evt.correlationId, name: evt.name }, 'A reprocessar evento...');
      
      try {
        // Reemite o evento para o Event Bus (transiente, pois já está no Strapi)
        eventBus.publish({
          id: evt.correlationId,
          name: evt.name,
          payload: evt.payload,
          timestamp: evt.createdAt,
        });

        // Marca como processado após a emissão
        // Fix: strapiPut already wraps body in { data: ... }
        await strapiPut(`/domain-events/${evt.documentId}`, {
          processed: true,
          processedAt: new Date().toISOString(),
        });
        
        log.info({ eventId: evt.correlationId }, 'Replay com sucesso.');
      } catch (err) {
        log.error({ err, eventId: evt.correlationId }, 'Falha contínua no replay deste evento.');
      }
    }

    log.info('Script de Replay concluído.');
  } catch (err) {
    log.error({ err }, 'Erro fatal ao executar script de replay do Outbox.');
  }
}

// Se foi invocado diretamente pela CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  replayUnprocessedEvents().catch(err => {
    log.fatal({ err }, 'Falha fatal no Replay Worker');
    process.exit(1);
  });
}

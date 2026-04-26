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
  log.info('Iniciando script de Replay do Outbox Pattern (Sovereign Replay)...');

  try {
    const res = await strapiGet<UnprocessedEvent & { attempts: number }>('/domain-events', {
      'filters[processed][$eq]': 'false',
      'pagination[limit]': '50', // Batch menor para evitar timeouts
      'sort': 'createdAt:asc',
    });
    
    const events = res.data;
    if (!events || events.length === 0) {
      log.info('Nenhum evento pendente encontrado no Outbox.');
      return;
    }

    for (const evt of events) {
      const attempts = evt.attempts || 0;
      
      // Exponential Backoff: Ignorar se falhou recentemente (2^attempts * 1min)
      const lastModified = new Date(evt.createdAt).getTime(); // Simplificação: usar createdAt ou updatedAt
      const waitTime = Math.pow(2, attempts) * 60 * 1000;
      if (Date.now() < lastModified + waitTime && attempts > 0) {
        continue;
      }

      log.info({ eventId: evt.correlationId, name: evt.name, attempts }, 'A processar evento...');
      
      try {
        // AWAIT IMPORTANTE: Aguarda a conclusão dos handlers (RedLock, external calls, etc)
        await eventBus.publish({
          id: evt.correlationId, // Reutiliza identidade canónica para garantir idempotência
          name: evt.name as any,
          payload: evt.payload as any,
          timestamp: evt.createdAt,
          correlationId: evt.correlationId
        }, evt.documentId);

        // Sucesso Total
        await strapiPut(`/domain-events/${evt.documentId}`, {
          processed: true,
          processedAt: new Date().toISOString(),
          attempts: attempts + 1,
        });
        
        log.info({ eventId: evt.correlationId }, 'Replay com sucesso.');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        log.error({ err: msg, eventId: evt.correlationId }, 'Falha no replay. Incrementando tentativas.');
        await strapiPut(`/domain-events/${evt.documentId}`, {
          attempts: attempts + 1,
        });
      }
    }
  } catch (err) {
    log.error({ err }, 'Erro fatal no script de replay do Outbox.');
  }
}

// Se foi invocado diretamente pela CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  replayUnprocessedEvents().catch(err => {
    log.fatal({ err }, 'Falha fatal no Replay Worker');
    process.exit(1);
  });
}

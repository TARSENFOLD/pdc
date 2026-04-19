import { strapiPost, strapiPut } from '../strapi/strapi.client.js';
import { DomainEventName, type DomainEvent } from './types.js';
import pino from 'pino';

const log = pino({ name: 'event-bus' });

/**
 * Interface para resultados de handlers que suportam retry granular (Approach §1.4)
 */
export interface HandlerResult {
  status: 'sent' | 'skipped' | 'retryable_error';
  reason?: string;
}

type Handler = (event: DomainEvent<any>) => Promise<HandlerResult | void | unknown>;

/**
 * EventBus Sovereign (Refactored R2.T3b)
 * Registry explícito de handlers + Outbox reentrante com Promise.allSettled.
 */
class EventBus {
  private handlers = new Map<string, Handler[]>();

  /**
   * Registry explícito de handlers (D1 requirement).
   */
  register(name: DomainEventName | string, handler: Handler): void {
    const existing = this.handlers.get(name) || [];
    this.handlers.set(name, [...existing, handler]);
  }

  /**
   * Publish an event locally and wait for handlers.
   * Aguarda todos os handlers via Promise.allSettled para isolamento de falhas.
   */
  async publish(event: DomainEvent): Promise<void> {
    const eventHandlers = this.handlers.get(event.name) || [];
    if (eventHandlers.length === 0) return;

    // Promise.allSettled para isolamento de falhas (D1)
    const results = await Promise.allSettled(
      eventHandlers.map(handler => handler(event))
    );

    // Mapear falhas (rejeições ou status de erro reprocessável)
    const failures = results.map((r, i) => {
      const handlerName = eventHandlers[i]?.name || `handler-${String(i)}`;
      if (r.status === 'rejected') {
        return { handler: handlerName, error: r.reason };
      }
      // Se o handler devolveu um objeto com status de erro (Approach §1.4)
      const val = r.value as HandlerResult | null;
      if (val && typeof val === 'object' && val.status === 'retryable_error') {
        return { handler: handlerName, reason: val.reason };
      }
      return null;
    }).filter((f): f is NonNullable<typeof f> => f !== null);

    if (failures.length > 0) {
      // Counter virtual via logs estruturados (Approach §1.5)
      log.error({ 
        eventId: event.id, 
        event: event.name, 
        failures,
        metric: 'domain_events_failed_total' 
      }, `EventBus: ${failures.length} handlers falharam para o evento ${event.name}`);
      
      // Propagamos erro para o outbox não marcar como processed (Retry requirement)
      throw new Error(`Handlers falharam para ${event.name}: ${failures.map(f => f.handler).join(', ')}`);
    }
  }

  /**
   * Domain Outbox Pattern implementation (AC requirement).
   * Persiste no Strapi primeiro, executa handlers e marca como processado no fim.
   */
  async publishWithOutbox(name: DomainEventName | string, payload: unknown): Promise<void> {
    const event: DomainEvent = {
      id: crypto.randomUUID(),
      name,
      payload,
      timestamp: new Date().toISOString(),
    };

    let eventRecordId: string | number | undefined;

    try {
      // 1. Persist to DB (Outbox)
      const res = await strapiPost<any>('/domain-events', {
        name: event.name,
        payload: event.payload,
        correlationId: event.id,
        processed: false,
      });
      eventRecordId = res.data?.id;

      // 2. Execute handlers
      await this.publish(event);

      // 3. Mark as processed if all succeeded
      if (eventRecordId) {
        await strapiPut(`/domain-events/${eventRecordId}`, {
          processed: true,
          processedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      log.error({ err, eventName: name, eventId: event.id }, 'Falha no processamento outbox do EventBus');
      // Mantém processed=false para retry
      throw err;
    }
  }
  
  /**
   * Alias de compatibilidade para testes e hooks legados.
   */
  on(name: string, handler: any) {
    this.register(name as any, handler);
  }

  /**
   * Alias para subscrever eventos (Interface Approach §1.4)
   */
  subscribe<T>(name: DomainEventName, handler: (e: DomainEvent<T>) => Promise<void>): void {
    this.register(name, handler as any);
  }
  
  /**
   * Limpa todos os handlers (usado em testes).
   */
  removeAllListeners() {
    this.handlers.clear();
  }
}

export const eventBus = new EventBus();

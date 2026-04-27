import pino from 'pino';
import { z } from 'zod';
import { redis } from '../../lib/redis.js';
import { strapiPost, strapiPut } from '../strapi/strapi.client.js';
import { 
  DomainEventName, 
  type DomainEvent, 
  type EcosystemHook, 
  EcosystemHookName,
  type EcosystemHookResult,
  type EcosystemHookContext,
  EventPayloadSchemas
} from '@pdc/shared';

const log = pino({ name: 'event-bus' });

class EventBus {
  private hooks: EcosystemHook<unknown>[] = [];

  /**
   * Registar um Hook G15 no ecossistema
   */
  registerHook<T>(hook: EcosystemHook<T>) {
    this.hooks.push(hook as EcosystemHook<unknown>);
    log.info({ hook: hook.name }, 'G15 Hook Registado');
  }

  /**
   * Métodos de Compatibilidade para Testes Legados
   */
  register(name: DomainEventName, handler: (event: DomainEvent<unknown>) => Promise<void>) {
    this.registerHook({
      name: `legacy-handler:${name}` as EcosystemHookName,
      dependencies: [],
      idempotencyKey: (e) => `legacy:${e.id}`,
      execute: async (e) => {
        await handler(e);
        return { status: 'sent' };
      }
    });
  }

  removeAllListeners() {
    this.hooks = [];
  }

  /**
   * Publicar evento com persistência Outbox e execução de Hooks G15
   */
  async publishWithOutbox<TName extends DomainEventName>(
    name: TName, 
    payload: unknown,
    id?: string
  ): Promise<DomainEvent<unknown>> {
    const resolvedId = id || crypto.randomUUID();
    const event: DomainEvent<unknown> = {
      id: resolvedId,
      name,
      payload: payload as Record<string, unknown>,
      timestamp: new Date().toISOString(),
      correlationId: resolvedId,
    };

    // 1. Validação Soberana de Payload
    const schema = (EventPayloadSchemas as Record<string, z.ZodTypeAny>)[name];
    if (schema) {
      const result = schema.safeParse(payload);
      if (!result.success) {
        log.error({ name, errors: result.error.format() }, 'Payload G15 Inválido');
        throw new Error(`Falha de contrato E2E no evento: ${name}`);
      }
      event.payload = result.data;
    }

    // 2. Persistência no Outbox (Strapi)
    let eventRecordId: string | number | undefined;
    try {
      const res = await strapiPost<{ id: string | number }>('/domain-events', {
        name: event.name,
        payload: event.payload,
        correlationId: event.id,
        processed: false,
      });
      eventRecordId = res.data?.id;

      // 3. Execução Orquestrada de Hooks
      await this.dispatchHooks(event, eventRecordId);

      // 4. Marcar como Processado
      if (eventRecordId) {
        await strapiPut<unknown>(`/domain-events/${eventRecordId}`, {
          processed: true,
          processedAt: new Date().toISOString(),
        });
      }
      
      return event;
    } catch (err) {
      log.error({ err, eventName: name }, 'Erro no Ciclo E2E G15');
      throw err;
    }
  }

  /**
   * Despachar ganchos para um evento já persistido (Replay)
   */
  async publish(event: DomainEvent<unknown>, eventRecordId?: string | number): Promise<void> {
    const schema = (EventPayloadSchemas as Record<string, z.ZodTypeAny>)[event.name];
    if (schema) {
      const result = schema.safeParse(event.payload);
      if (!result.success) {
        log.error({ name: event.name, errors: result.error.format() }, 'Payload G15 Inválido no Replay');
        throw new Error(`Falha de contrato E2E no evento: ${event.name}`);
      }
      event.payload = result.data;
    }
    await this.dispatchHooks(event, eventRecordId);
  }

  private async dispatchHooks(event: DomainEvent<unknown>, eventRecordId?: string | number): Promise<void> {
    const context: EcosystemHookContext = {
      results: {} as Record<EcosystemHookName, EcosystemHookResult>
    };

    // Persiste snapshot completo após cada hook. A escrita ocorre DEPOIS de acumular em
    // context.results para que o último hook paralelo a terminar sempre escreva o snapshot
    // mais completo. Last-write-wins é seguro porque context.results é monotônico.
    let persistLock = Promise.resolve();

    const persistSnapshot = async (hookName: EcosystemHookName) => {
      if (!eventRecordId) return;
      persistLock = persistLock.then(async () => {
        try {
          await strapiPut(`/domain-events/${eventRecordId}`, {
            hookResults: { ...context.results }
          });
        } catch (err) {
          log.warn({ err, hook: hookName, eventId: event.id }, 'Falha ao persistir hookResult incremental');
        }
      });
      return persistLock;
    };

    // FASE 1: Hooks Independentes (Ranking, Feed, Match, Achievement)
    const independentHooks = this.hooks.filter(h => h.name !== EcosystemHookName.NOTIFY);

    await Promise.allSettled(independentHooks.map(async (hook) => {
      const result = await this.executeHook(hook, event, context);
      context.results[hook.name] = result;
      await persistSnapshot(hook.name);
    }));

    // FASE 2: Notify (Sempre último, agrega side-effects)
    const notifyHook = this.hooks.find(h => h.name === EcosystemHookName.NOTIFY);
    if (notifyHook) {
      const result = await this.executeHook(notifyHook, event, context);
      context.results[notifyHook.name] = result;
      await persistSnapshot(notifyHook.name);
    }
  }

  private async executeHook(
    hook: EcosystemHook,
    event: DomainEvent,
    context: EcosystemHookContext
  ): Promise<EcosystemHookResult> {
    const key = `idempotency:${hook.name}:${hook.idempotencyKey(event)}`;

    // Check Idempotência (Redis SADD)
    const isNew = await redis.sadd(key, event.id);
    if (isNew === 0) {
      return { status: 'skipped', reason: 'already-processed' };
    }
    // Expiração de 7 dias para a chave de idempotência
    await redis.expire(key, 604800);

    try {
      return await hook.execute(event, context);
    } catch (err) {
      log.error({ err, hook: hook.name, eventId: event.id }, 'Falha no Hook');
      return { status: 'retryable_error', reason: err instanceof Error ? err.message : 'Unknown' };
    }
  }
}

export const eventBus = new EventBus();

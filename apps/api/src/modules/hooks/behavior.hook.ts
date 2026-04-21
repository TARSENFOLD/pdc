import { 
  type EcosystemHook, 
  EcosystemHookName, 
  type EcosystemHookResult, 
  type DomainEvent, 
  DomainEventName 
} from '@pdc/shared';
import { telemetriaProcessor } from '../telemetria/telemetria.processor.js';
import pino from 'pino';

const log = pino({ name: 'behavior-hook' });

export interface BehaviorEventPayload {
  perfilId: string;
  tentativaId: string;
  simulacaoId?: string;
  area?: string; // Fundamental para o domainId no behavior_patterns
}

/**
 * Hook 6: BEHAVIOR (Músculo Comportamental)
 * Dispara o processamento de padrões cognitivos após telemetria densa.
 */
export const behaviorHook: EcosystemHook<BehaviorEventPayload> = {
  name: EcosystemHookName.BEHAVIOR, 
  dependencies: [EcosystemHookName.RANKING], // Corre após o ranking
  
  idempotencyKey: (event) => `behavior:${event.id}`,

  async execute(event: DomainEvent<BehaviorEventPayload>): Promise<EcosystemHookResult> {
    const triggerEvents: string[] = [
      DomainEventName.TENTATIVA_CONCLUIDA,
      DomainEventName.CURSO_MODULO_CONCLUIDO,
      DomainEventName.PROGRAMA_CONCLUIDO
    ];

    if (!triggerEvents.includes(event.name)) {
      return { hook: EcosystemHookName.BEHAVIOR, status: 'skipped', reason: 'not-a-behavior-trigger-event' };
    }

    const payload = event.payload;
    const { perfilId, area } = payload;
    if (!perfilId || !area) {
      return { hook: EcosystemHookName.BEHAVIOR, status: 'failed', reason: 'perfilId-or-area-missing' };
    }

    try {
      // Gatilho imediato do "Músculo"
      // Transforma dados brutos em assinatura comportamental DNA
      await telemetriaProcessor.processUserDomain(perfilId, area);

      return { hook: EcosystemHookName.BEHAVIOR, status: 'success' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      log.error({ err, event: event.name, perfilId }, 'Falha no hook de comportamento');
      return { hook: EcosystemHookName.BEHAVIOR, status: 'retryable_error', reason: message };
    }
  }
};

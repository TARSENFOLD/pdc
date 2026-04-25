import { DomainEvent } from './domain-events.js';

export enum EcosystemHookName {
  RANKING = 'ranking',
  FEED = 'feed',
  MATCH = 'match',
  ACHIEVEMENT = 'achievement',
  NOTIFY = 'notify',
  BEHAVIOR = 'behavior'
}

export interface EcosystemHookContext {
  results: Record<EcosystemHookName, EcosystemHookResult>;
}

export interface EcosystemHookResult<T = unknown> {
  status: 'sent' | 'skipped' | 'retryable_error' | 'fatal_error';
  reason?: string;
  data?: T;
}

export interface LtiScoreResult extends EcosystemHookResult {
  scoreEmitted?: number;
}

export interface EcosystemHook<TPayload = unknown> {
  name: EcosystemHookName;
  dependencies: EcosystemHookName[];
  idempotencyKey: (event: DomainEvent<TPayload>) => string;
  execute: (event: DomainEvent<TPayload>, context: EcosystemHookContext) => Promise<EcosystemHookResult>;
  compensate?: (event: DomainEvent<TPayload>, context: EcosystemHookContext) => Promise<void>;
}

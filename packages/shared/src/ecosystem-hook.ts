import { DomainEvent } from './domain-events.js';

export enum EcosystemHookName {
  RANKING = 'ranking',
  FEED = 'feed',
  MATCH = 'match',
  ACHIEVEMENT = 'achievement',
  NOTIFY = 'notify'
}

export interface EcosystemHookContext {
  results: Record<EcosystemHookName, EcosystemHookResult>;
}

export interface EcosystemHookResult {
  status: 'sent' | 'skipped' | 'retryable_error' | 'fatal_error';
  reason?: string;
  data?: any;
}

export interface EcosystemHook<TPayload = any> {
  name: EcosystemHookName;
  dependencies: EcosystemHookName[];
  idempotencyKey: (event: DomainEvent<TPayload>) => string;
  execute: (event: DomainEvent<TPayload>, context: EcosystemHookContext) => Promise<EcosystemHookResult>;
  compensate?: (event: DomainEvent<TPayload>, context: EcosystemHookContext) => Promise<void>;
}

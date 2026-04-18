import type { TelemetriaEvento } from '../telemetry.js';

export interface SanityResult {
  valid: boolean;
  reason?: string;
  ruleName?: string;
}

export type SanityRuleContext = {
  eventsInLastSecond?: number;
  lastStep?: number;
  allowBacktrack?: boolean;
  [key: string]: unknown;
};

export type SanityRule = (event: TelemetriaEvento, context?: SanityRuleContext) => SanityResult;

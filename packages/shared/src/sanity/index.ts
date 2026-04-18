import type { TelemetriaEvento } from '../telemetry.js';
import type { SanityRule, SanityResult, SanityRuleContext } from './types.js';
import { 
  ruleNoFutureTimestamp, 
  ruleNoNegativeDwellTime, 
  ruleMaxEventsPerSecond, 
  ruleValidScoreRange, 
  ruleValidSequence 
} from './rules.js';

export * from './types.js';
export * from './rules.js';

// Fast checks for the Edge worker pre-LPUSH
export const EDGE_SANITY_RULES: SanityRule[] = [
  ruleNoFutureTimestamp,
  ruleNoNegativeDwellTime,
  ruleValidScoreRange
];

// Deep checks for the BFF Consumer pre-persist
export const BFF_SANITY_RULES: SanityRule[] = [
  ruleNoFutureTimestamp,
  ruleNoNegativeDwellTime,
  ruleMaxEventsPerSecond,
  ruleValidScoreRange,
  ruleValidSequence
];

export function applySanityRules(event: TelemetriaEvento, rules: SanityRule[], context?: SanityRuleContext): SanityResult {
  for (const rule of rules) {
    const result = rule(event, context);
    if (!result.valid) {
      return result;
    }
  }
  return { valid: true };
}

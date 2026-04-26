import { describe, it, expect } from 'vitest';
import { applySanityRules, EDGE_SANITY_RULES, BFF_SANITY_RULES } from './index.js';
import type { TelemetriaEvento } from '../telemetry.js';

describe('Sanity Rules Tests', () => {
  it('should invalidate future timestamps', () => {
    const event = { eventId: '1', tipo: 'simulacao.iniciada', timestamp: new Date(Date.now() + 100000).toISOString(), payload: {} };
    const result = applySanityRules(event as TelemetriaEvento, EDGE_SANITY_RULES);
    expect(result.valid).toBe(false);
    expect(result.ruleName).toBe('ruleNoFutureTimestamp');
  });

  it('should invalidate negative dwellTime', () => {
    const event = { eventId: '2', tipo: 'simulacao.iniciada', timestamp: new Date().toISOString(), payload: { dwellTime: -50 } };
    const result = applySanityRules(event as TelemetriaEvento, EDGE_SANITY_RULES);
    expect(result.valid).toBe(false);
  });

  it('should pass valid events', () => {
    const event = { eventId: '3', tipo: 'simulacao.iniciada', timestamp: new Date().toISOString(), payload: { dwellTime: 50, score: 90 } };
    const result = applySanityRules(event as TelemetriaEvento, BFF_SANITY_RULES);
    expect(result.valid).toBe(true);
  });

  it('should invalidate max events per second in BFF', () => {
    const event = { eventId: '4', tipo: 'simulacao.iniciada', timestamp: new Date().toISOString(), payload: {} };
    const result = applySanityRules(event as TelemetriaEvento, BFF_SANITY_RULES, { eventsInLastSecond: 60 });
    expect(result.valid).toBe(false);
    expect(result.ruleName).toBe('ruleMaxEventsPerSecond');
  });
});

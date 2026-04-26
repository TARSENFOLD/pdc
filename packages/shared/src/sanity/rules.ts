import type { SanityRule } from './types.js';

// 1. timestamp impossível (no futuro além de 1min clock skew)
export const ruleNoFutureTimestamp: SanityRule = (event) => {
  const eventTime = new Date(event.timestamp).getTime();
  const maxFuture = Date.now() + 60000;
  if (eventTime > maxFuture) {
    return { valid: false, reason: 'Timestamp encontra-se no futuro absoluto', ruleName: 'ruleNoFutureTimestamp' };
  }
  return { valid: true };
};

// 2. dwellTime negativo (viagem no tempo detectada)
export const ruleNoNegativeDwellTime: SanityRule = (event) => {
  if (typeof event.payload.dwellTime === 'number' && event.payload.dwellTime < 0) {
    return { valid: false, reason: 'dwellTime negativo - impossibilidade temporal', ruleName: 'ruleNoNegativeDwellTime' };
  }
  return { valid: true };
};

// 3. eventos por segundo absurdos (> 50 hz via context, ou impossíveis num browser single thread human-driven)
export const ruleMaxEventsPerSecond: SanityRule = (_event, context) => {
  if (context?.eventsInLastSecond !== undefined && context.eventsInLastSecond > 50) {
    return { valid: false, reason: 'Frequência excede 50hz (Humanamente Impossível)', ruleName: 'ruleMaxEventsPerSecond' };
  }
  return { valid: true };
};

// 4. Score ou precisão fora de range matemático impossível (se enviados directos)
export const ruleValidScoreRange: SanityRule = (event) => {
  if (typeof event.payload.score === 'number') {
    if (event.payload.score < -1000 || event.payload.score > 1000) {
      return { valid: false, reason: 'Score com valor irreal', ruleName: 'ruleValidScoreRange' };
    }
  }
  return { valid: true };
};

// 5. Backtracking em simulações sequenciais lineares restritas
export const ruleValidSequence: SanityRule = (event, context) => {
  if (typeof event.payload.step === 'number' && context?.lastStep !== undefined) {
    if (event.payload.step < context.lastStep && !context.allowBacktrack) {
      return { valid: false, reason: 'Backtracking não permitido nesta sequência', ruleName: 'ruleValidSequence' };
    }
  }
  return { valid: true };
};

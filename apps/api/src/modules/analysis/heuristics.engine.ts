import { computeFluidity, computeResilience, computeFocus, computeHesitation } from '@pdc/shared';
import type { TelemetriaEvento } from '@pdc/shared';

/**
 * Heuristics Engine — thin shell over @pdc/shared heuristics-calculator.
 * All math lives in the shared package; this module is a stable BFF adapter.
 */
export const heuristicsEngine = {
  calculateFluidity(times: number[], baselineMs = 2000): number {
    return computeFluidity(times, baselineMs);
  },

  calculateResilience(timesPosError: number[], meanTimeNormal: number): number {
    return computeResilience(timesPosError, meanTimeNormal);
  },

  calculateFocus(totalTimeMs: number, interruptionTimeMs: number): number {
    return computeFocus(totalTimeMs, interruptionTimeMs);
  },

  calculateHesitation(events: TelemetriaEvento[]): number {
    return computeHesitation(events);
  },
};

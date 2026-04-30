import type { TelemetriaEvento } from './telemetry.js';

export interface BiomechanicsSummary {
  fluidity: number; // 0-10
  resilience: number; // 0-10
  focusStability: number; // 0-10
  hesitation: number; // 0-10 (High = more hesitation)
}

interface PosErrorPayload {
  timeMs: number;
}

interface BiomechanicsPayload {
  x: number;
  y: number;
}

function isPosErrorPayload(p: unknown): p is PosErrorPayload {
  if (!p || typeof p !== 'object' || !('timeMs' in p)) return false;
  const obj = p as Record<string, unknown>;
  return typeof obj.timeMs === 'number';
}

function isBiomechanicsPayload(p: unknown): p is BiomechanicsPayload {
  if (!p || typeof p !== 'object' || !('x' in p) || !('y' in p)) return false;
  const obj = p as Record<string, unknown>;
  return typeof obj.x === 'number' && typeof obj.y === 'number';
}

/**
 * Compute cognitive fluidity from decision time array.
 * phi = (baseline / mean_time) * (1 - coefficient_of_variation), normalized 0-10.
 */
export function computeFluidity(times: number[], baselineMs = 2000): number {
  if (times.length === 0) return 0;
  const mean = times.reduce((a, b) => a + b, 0) / times.length;
  if (mean === 0) return 0;
  const variance = times.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / times.length;
  const cv = Math.sqrt(variance) / mean;
  const phi = (baselineMs / mean) * (1 - cv);
  return Math.max(0, Math.min(10, phi * 10));
}

/**
 * Compute resilience index from post-error times vs normal mean.
 * r = mean_pos_error / mean_normal; maps to 0-10 via thresholds.
 */
export function computeResilience(timesPosError: number[], meanTimeNormal: number): number {
  if (timesPosError.length === 0) return 10;
  const meanPosError = timesPosError.reduce((a, b) => a + b, 0) / timesPosError.length;
  const r = meanPosError / (meanTimeNormal || 1);
  if (r < 0.9) return 10; // Prémio Soberano: Recuperação ultra-rápida (Wave 4)
  if (r >= 0.9 && r <= 1.2) return 9.8;
  if (r > 1.2 && r <= 2.0) return 7.5;
  return 4.0; // r > 2.0
}

/**
 * Compute focus stability from total time and interruption time.
 * stability = (total - interruption) / total, mapped via thresholds.
 */
export function computeFocus(totalTimeMs: number, interruptionTimeMs: number): number {
  if (totalTimeMs <= 0) return 0;
  const stability = (totalTimeMs - interruptionTimeMs) / totalTimeMs;
  if (stability >= 0.9) return 10;
  if (stability >= 0.7) return 8.0;
  return 5.0;
}

/**
 * Compute hesitation index from biomechanics events.
 * Counts erratic micro-movements (dist < 5px, dt > 500ms), normalised 0-10.
 */
export function computeHesitation(events: TelemetriaEvento[]): number {
  const bioEvents = events.filter(e => e.tipo === 'simulacao.biomechanics');
  if (bioEvents.length < 2) return 0;
  let erraticMovements = 0;
  for (let i = 1; i < bioEvents.length; i++) {
    const pEvt = bioEvents[i - 1];
    const cEvt = bioEvents[i];
    if (!pEvt || !cEvt) continue;
    const prev = pEvt.payload;
    const curr = cEvt.payload;
    if (isBiomechanicsPayload(prev) && isBiomechanicsPayload(curr)) {
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const dt = new Date(cEvt.timestamp).getTime() - new Date(pEvt.timestamp).getTime();
      if (dist < 5 && dt > 500) erraticMovements++;
    }
  }
  return Math.min(10, erraticMovements * 2);
}

/**
 * Convenience aggregator: extracts canonical inputs from raw events and delegates
 * to the individual compute functions. All math is centralised in those functions.
 */
export function calculateBiomechanics(events: TelemetriaEvento[]): BiomechanicsSummary {
  if (events.length === 0) {
    return { fluidity: 0, resilience: 0, focusStability: 0, hesitation: 0 };
  }

  // Decision times: consecutive simulacao.* events (excl. biomechanics), 50ms–2min window
  const decisionTimes: number[] = [];
  let totalInterruptionMs = 0;
  for (let i = 1; i < events.length; i++) {
    const prev = events[i - 1];
    const curr = events[i];
    if (!prev || !curr) continue;
    const diff = new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime();
    if (diff > 50 && diff < 120_000) {
      if (curr.tipo.startsWith('simulacao.') && curr.tipo !== 'simulacao.biomechanics') {
        decisionTimes.push(diff);
      }
      if (prev.tipo === 'focus_lost') {
        totalInterruptionMs += diff;
      }
    }
  }

  const firstEvent = events[0];
  const lastEvent = events[events.length - 1];
  if (!firstEvent || !lastEvent) {
    return { fluidity: 0, resilience: 0, focusStability: 0, hesitation: 0 };
  }
  const firstTs = new Date(firstEvent.timestamp).getTime();
  const lastTs = new Date(lastEvent.timestamp).getTime();
  const totalMs = Math.max(0, lastTs - firstTs);

  const timesPosError = events
    .filter(e => e.tipo === 'simulacao.pos_error')
    .flatMap(e => isPosErrorPayload(e.payload) ? [e.payload.timeMs] : []);

  const fluidity = computeFluidity(decisionTimes);
  const meanNormal = decisionTimes.length > 0
    ? decisionTimes.reduce((a, b) => a + b, 0) / decisionTimes.length
    : 2000;

  return {
    fluidity,
    resilience: computeResilience(timesPosError, meanNormal),
    focusStability: computeFocus(totalMs, totalInterruptionMs),
    hesitation: computeHesitation(events),
  };
}

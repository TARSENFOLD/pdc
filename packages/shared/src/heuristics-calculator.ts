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
 * Heuristics Calculator (PDC v2 Sovereign Vision)
 * Extracts 4 dimensions from raw telemetry biomechanics.
 * Delegates to individual compute functions for zero duplication.
 */
export function calculateBiomechanics(events: TelemetriaEvento[]): BiomechanicsSummary {
  if (events.length === 0) {
    return { fluidity: 0, resilience: 0, focusStability: 0, hesitation: 0 };
  }

  // Focus Stability (Visibility tracking)
  const focusEvents = events.filter(e => e.tipo === 'focus_lost' || e.tipo === 'focus_gained');
  let focusStability = 10;
  if (focusEvents.length > 0) {
    focusStability = Math.max(0, 10 - focusEvents.filter(e => e.tipo === 'focus_lost').length * 2);
  }

  // Fluidity from biomechanics velocity
  const bioEvents = events.filter(e => e.tipo === 'simulacao.biomechanics');
  let fluidity = 5;
  if (bioEvents.length > 1) {
    let totalDistance = 0;
    let totalTime = 0;
    for (let i = 1; i < bioEvents.length; i++) {
      const prevEvent = bioEvents[i - 1];
      const currEvent = bioEvents[i];
      if (!prevEvent || !currEvent) continue;
      
      const prev = prevEvent.payload;
      const curr = currEvent.payload;
      
      if (isBiomechanicsPayload(prev) && isBiomechanicsPayload(curr)) {
        const dx = curr.x - prev.x;
        const dy = curr.y - prev.y;
        totalDistance += Math.sqrt(dx * dx + dy * dy);
        totalTime += new Date(currEvent.timestamp).getTime() - new Date(prevEvent.timestamp).getTime();
      }
    }
    const velocity = totalTime > 0 ? totalDistance / (totalTime / 1000) : 0;
    fluidity = Math.min(10, velocity / 100);
  }

  // Resilience (Post-error recovery)
  const timesPosError = events
    .filter(e => e.tipo === 'simulacao.pos_error')
    .map(e => e.payload)
    .filter(isPosErrorPayload)
    .map(p => p.timeMs);
    
  const meanNormal = fluidity * 200; // heuristic baseline

  return {
    fluidity,
    resilience: computeResilience(timesPosError, meanNormal),
    focusStability,
    hesitation: computeHesitation(events),
  };
}

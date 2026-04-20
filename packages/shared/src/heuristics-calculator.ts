import type { TelemetriaEvento } from './telemetry.js';

export interface BiomechanicsSummary {
  fluidity: number; // 0-10
  resilience: number; // 0-10
  focusStability: number; // 0-10
  hesitation: number; // 0-10 (High = more hesitation)
}

/**
 * Heuristics Calculator (PDC v2 Sovereign Vision)
 * Extracts 4 dimensions from raw telemetry biomechanics.
 */
export function calculateBiomechanics(events: TelemetriaEvento[]): BiomechanicsSummary {
  if (events.length === 0) {
    return { fluidity: 0, resilience: 0, focusStability: 0, hesitation: 0 };
  }

  // 1. Focus Stability (Visibility tracking)
  const focusEvents = events.filter(e => e.tipo === 'focus_lost' || e.tipo === 'focus_gained');
  let focusStability = 10;
  if (focusEvents.length > 0) {
    // Punish every loss of focus
    focusStability = Math.max(0, 10 - focusEvents.filter(e => e.tipo === 'focus_lost').length * 2);
  }

  // 2. Fluidity & Hesitation (Mouse Trajectories)
  const bioEvents = events.filter(e => e.tipo === 'simulacao.biomechanics');
  let fluidity = 5;
  let hesitation = 0;

  if (bioEvents.length > 1) {
    let totalDistance = 0;
    let totalTime = 0;
    let erraticMovements = 0;

    for (let i = 1; i < bioEvents.length; i++) {
      const prevEvent = bioEvents[i - 1];
      const currEvent = bioEvents[i];
      if (!prevEvent || !currEvent) continue;

      const prev = prevEvent.payload as { x: number; y: number; timestamp?: string };
      const curr = currEvent.payload as { x: number; y: number; timestamp?: string };
      
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      totalDistance += dist;

      const dt = new Date(currEvent.timestamp).getTime() - new Date(prevEvent.timestamp).getTime();
      totalTime += dt;

      // Hesitation: Detect "entropy" (mechanical vs cognitive)
      // erratic if dist is small but time is high (vibrating/loops)
      if (dist < 5 && dt > 500) {
        erraticMovements++;
      }
    }

    const velocity = totalDistance / (totalTime / 1000); // pixels per sec
    fluidity = Math.min(10, velocity / 100); // 1000px/s = 10
    hesitation = Math.min(10, erraticMovements * 2);
  }

  // 3. Resilience (Post-failure recovery)
  // We look for events after a "failure" event (if tracked)
  // For now, it's a baseline
  const resilience = 7.5; 

  return {
    fluidity,
    resilience,
    focusStability,
    hesitation,
  };
}

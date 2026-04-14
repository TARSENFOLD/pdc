import { socketService } from '../realtime/socket.service.js';

const TTL_MS = 60_000;
const DEBOUNCE_MS = 1_000;

const active = new Map<string, Set<string>>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const pendingEmit = new Map<string, ReturnType<typeof setTimeout>>();

function scheduleEmit(area: string): void {
  const existing = pendingEmit.get(area);
  if (existing) clearTimeout(existing);
  pendingEmit.set(
    area,
    setTimeout(() => {
      pendingEmit.delete(area);
      const count = active.get(area)?.size ?? 0;
      socketService.emitirLandingPulse(area === 'GERAL' ? undefined : area, count);
    }, DEBOUNCE_MS),
  );
}

export const pulseService = {
  recordActivity(sessionId: string, area?: string): void {
    const key = area?.trim().toUpperCase() || 'GERAL';
    const ttlKey = `${key}:${sessionId}`;

    // Cancel existing TTL timer for this session+area
    const existingTtl = timers.get(ttlKey);
    if (existingTtl) clearTimeout(existingTtl);

    // Add sessionId to active set
    let sessionSet = active.get(key);
    if (!sessionSet) {
      sessionSet = new Set<string>();
      active.set(key, sessionSet);
    }
    sessionSet.add(sessionId);

    // Schedule TTL expiry
    timers.set(
      ttlKey,
      setTimeout(() => {
        timers.delete(ttlKey);
        const set = active.get(key);
        if (set) {
          set.delete(sessionId);
          if (set.size === 0) active.delete(key);
        }
        scheduleEmit(key);
      }, TTL_MS),
    );

    scheduleEmit(key);
  },
};

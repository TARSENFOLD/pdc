import pino from 'pino';
import { redis } from '../../../lib/redis.js';
import { strapiPut, strapiGet } from '../../strapi/strapi.client.js';
import { eventBus } from '../../events/event-bus.js';
import { DomainEventName } from '../../events/types.js';
import { analyzeFluidity, analyzeResilience, analyzeFocus, type TelemetriaEvento } from '@pdc/shared';

const log = pino({ name: 'sim-2-3-engine' });

const SESSION_TTL_SECONDS = 4 * 60 * 60;
const FINALIZED_TTL_SECONDS = 24 * 60 * 60;
const AREA_CACHE_TTL_MS = 5 * 60 * 1000;

const simulacaoAreaCache = new Map<string, { area: string; expiresAt: number }>();

async function fetchSimulacaoArea(tentativaId: string): Promise<string> {
  const cached = simulacaoAreaCache.get(tentativaId);
  if (cached && cached.expiresAt > Date.now()) return cached.area;
  try {
    const res = await strapiGet<{ simulacao?: { area?: string } }>(
      '/tentativas',
      { 'filters[id][$eq]': tentativaId, populate: 'simulacao', 'pagination[pageSize]': '1' },
    );
    const area = res.data[0]?.simulacao?.area ?? 'simulacao';
    simulacaoAreaCache.set(tentativaId, { area, expiresAt: Date.now() + AREA_CACHE_TTL_MS });
    return area;
  } catch {
    return 'simulacao';
  }
}

interface SessionState {
  events: TelemetriaEvento[];
  perfilId?: string;
}

export interface SessionScore {
  score: number;
  areaScore: Record<string, number>;
  fluidez: number;
  resiliencia: number;
  foco: number;
}

function sessionKey(tentativaId: string, sessionId: string): string {
  return `sim:session:${tentativaId}:${sessionId}`;
}

function finalizedKey(tentativaId: string): string {
  return `sim:finalized:${tentativaId}`;
}

export async function aggregateLabEvent(
  tentativaId: string,
  sessionId: string,
  event: TelemetriaEvento,
): Promise<void> {
  const key = sessionKey(tentativaId, sessionId);
  const existing = await redis.get<SessionState>(key);

  const state: SessionState = existing ?? { events: [] };
  state.events.push(event);
  if (event.perfilId && !state.perfilId) {
    state.perfilId = event.perfilId;
  }

  await redis.set(key, state, { ex: SESSION_TTL_SECONDS });
}

export function derivePerSession(events: TelemetriaEvento[]): SessionScore {
  if (events.length === 0) {
    return { score: 0, areaScore: {}, fluidez: 0, resiliencia: 0, foco: 0 };
  }

  const sorted = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  // Fluidity: inter-event intervals normalized to 0-1
  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (prev && curr) {
      const dt = new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime();
      if (dt > 50 && dt < 60_000) intervals.push(dt);
    }
  }
  const avgIntervalMs = intervals.length > 0
    ? intervals.reduce((a, b) => a + b, 0) / intervals.length
    : 5000;
  // 500ms avg → phi=1.0; 10s+ → phi=0.0
  const phi = Math.max(0, Math.min(1, 1 - (avgIntervalMs - 500) / 9500));

  // Resilience: recovery ratio after error events
  let r = 1.0;
  const errorIndices: number[] = sorted.reduce<number[]>((acc, e, idx) => {
    const isError =
      e.tipo.includes('erro') ||
      e.tipo.includes('falha') ||
      (typeof e.payload?.['type'] === 'string' && e.payload['type'] === 'error');
    return isError ? [...acc, idx] : acc;
  }, []);

  if (errorIndices.length > 0 && avgIntervalMs > 0) {
    const recoveryTimes: number[] = [];
    for (const idx of errorIndices) {
      const errEvent = sorted[idx];
      const nextEvent = sorted[idx + 1];
      if (errEvent && nextEvent) {
        const dt = new Date(nextEvent.timestamp).getTime() - new Date(errEvent.timestamp).getTime();
        if (dt > 0 && dt < 60_000) recoveryTimes.push(dt);
      }
    }
    if (recoveryTimes.length > 0) {
      const avgRecovery = recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length;
      r = avgRecovery / avgIntervalMs;
    }
  }

  // Focus: fraction of session time with active attention
  const totalMs =
    sorted.length >= 2
      ? new Date(sorted[sorted.length - 1]!.timestamp).getTime() -
        new Date(sorted[0]!.timestamp).getTime()
      : 0;

  let lostMs = 0;
  const lostEvents = sorted.filter(
    e => e.tipo === 'focus_lost' || e.tipo === 'visibility.lost',
  );
  const gainedEvents = sorted.filter(
    e => e.tipo === 'focus_gained' || e.tipo === 'visibility.gained',
  );
  for (let i = 0; i < lostEvents.length; i++) {
    const lost = lostEvents[i];
    const gained = gainedEvents[i];
    if (lost && gained) {
      const dt = new Date(gained.timestamp).getTime() - new Date(lost.timestamp).getTime();
      if (dt > 0) lostMs += dt;
    }
  }
  const stability = totalMs > 0 ? Math.max(0, 1 - lostMs / totalMs) : 0.8;

  const hFluidity = analyzeFluidity(phi);
  const hResilience = analyzeResilience(r);
  const hFocus = analyzeFocus(stability);

  const fluidez = hFluidity.score;
  const resiliencia = hResilience.score;
  const foco = hFocus.score;

  // Weighted composite on 0-10 scale → convert to 0-100
  const rawScore = fluidez * 0.4 + resiliencia * 0.35 + foco * 0.25;
  const score = Math.round(Math.max(0, Math.min(100, rawScore * 10)));

  return {
    score,
    areaScore: {
      fluidez: Math.round(fluidez * 10),
      resiliencia: Math.round(resiliencia * 10),
      foco: Math.round(foco * 10),
    },
    fluidez,
    resiliencia,
    foco,
  };
}

export async function finalizeSession(tentativaId: string, sessionId: string): Promise<void> {
  // Idempotency: NX ensures only the first finalization runs
  const isNew = await redis.set(finalizedKey(tentativaId), '1', {
    nx: true,
    ex: FINALIZED_TTL_SECONDS,
  });
  if (!isNew) {
    log.warn({ tentativaId }, 'Session já finalizada — idempotência garantida');
    return;
  }

  const state = await redis.get<SessionState>(sessionKey(tentativaId, sessionId));
  if (!state) {
    log.warn({ tentativaId, sessionId }, 'Sem eventos acumulados para session — score zero');
    return;
  }

  const { score, areaScore } = derivePerSession(state.events);

  await strapiPut<unknown>(`/tentativas/${tentativaId}`, {
    score,
    areaScore,
    dataFim: new Date().toISOString(),
    status: 'concluida',
  });

  const area = await fetchSimulacaoArea(tentativaId);

  // Fire-and-forget: não bloqueia o retorno (§7 Telemetria Sagrada)
  void eventBus
    .publishWithOutbox(DomainEventName.TENTATIVA_CONCLUIDA, {
      tentativaId,
      perfilId: state.perfilId ?? '',
      area,
      score,
    })
    .catch((err: unknown) => {
      log.error({ err, tentativaId }, 'Falha ao emitir TENTATIVA_CONCLUIDA');
    });

  log.info({ tentativaId, score }, 'Sessão lab finalizada — score derivado e persistido');
}

export async function handleLabEvent(event: TelemetriaEvento): Promise<void> {
  const tentativaId =
    typeof event.payload?.['tentativaId'] === 'string' ? event.payload['tentativaId'] : undefined;
  const sessionId = event.sessionId;

  if (!tentativaId || !sessionId) {
    log.warn(
      { eventId: event.eventId, tipo: event.tipo },
      'Lab event sem tentativaId/sessionId — ignorado',
    );
    return;
  }

  if (event.tipo === 'simulacao.lab.event' || event.tipo === 'simulacao.lab.session.started') {
    await aggregateLabEvent(tentativaId, sessionId, event);
  } else if (event.tipo === 'simulacao.lab.session.ended') {
    await aggregateLabEvent(tentativaId, sessionId, event);
    await finalizeSession(tentativaId, sessionId);
  }
}

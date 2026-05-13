import pino from 'pino';
import { redis } from '../../../lib/redis.js';
import { strapiPut, strapiGet } from '../../strapi/strapi.client.js';
import { eventBus } from '../../events/event-bus.js';
import { DomainEventName } from '../../events/types.js';
import { analyzeFluidity, analyzeResilience, analyzeFocus, type TelemetriaEvento } from '@pdc/shared';

const log = pino({ name: 'sim-2-3-engine' });

const SESSION_TTL_SECONDS = 4 * 60 * 60;
const FINALIZED_TTL_SECONDS = 24 * 60 * 60;
const FINALIZING_TTL_SECONDS = 60;
const AREA_CACHE_TTL_MS = 5 * 60 * 1000;
const AREA_CACHE_TTL_SECONDS = Math.ceil(AREA_CACHE_TTL_MS / 1000);
const MAX_SESSION_EVENTS = 2000;
// Assumed cadence for single-event sessions when no interval can be derived.
const DEFAULT_AVERAGE_INTERVAL_MS = 5000;
// Assumed attention stability when the session duration cannot be measured.
const DEFAULT_STABILITY_SCORE = 0.8;

function simulacaoAreaKey(tentativaId: string): string {
  return `sim:area:${tentativaId}`;
}

async function incrementTentativaConcluidaPublishFailure(
  tentativaId: string,
  perfilId: string,
): Promise<void> {
  const day = new Date().toISOString().slice(0, 10);
  const metricKey = `metrics:tentativasConcluidasPublishFailures:${day}`;
  await redis.incr(metricKey);
  await redis.expire(metricKey, 60 * 60 * 24 * 14);
  log.warn(
    { metric: 'tentativasConcluidasPublishFailures', tentativaId, perfilId },
    'Métrica de falha TENTATIVA_CONCLUIDA incrementada',
  );
}

async function fetchSimulacaoArea(tentativaId: string): Promise<string> {
  try {
    const cacheKey = simulacaoAreaKey(tentativaId);
    const cached = await redis.get<string>(cacheKey);
    if (typeof cached === 'string' && cached.length > 0) return cached;

    const res = await strapiGet<{ simulacao?: { area?: string } }>(
      '/tentativas',
      { 'filters[id][$eq]': tentativaId, populate: 'simulacao', 'pagination[pageSize]': '1' },
    );
    const area = res.data[0]?.simulacao?.area ?? 'simulacao';
    await redis.set(cacheKey, area, { ex: AREA_CACHE_TTL_SECONDS });
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
  if (state.events.length > MAX_SESSION_EVENTS) {
    state.events = state.events.slice(-MAX_SESSION_EVENTS);
  }
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
    : DEFAULT_AVERAGE_INTERVAL_MS;
  // 500ms avg → phi=1.0; 10s+ → phi=0.0
  const phi = Math.max(0, Math.min(1, 1 - (avgIntervalMs - 500) / 9500));

  // Resilience: recovery ratio after error events
  let r = 1.0;
  const errorIndices: number[] = sorted.reduce<number[]>((acc, e, idx) => {
    const isError =
      e.tipo.includes('erro') ||
      e.tipo.includes('falha') ||
      (typeof e.payload['type'] === 'string' && e.payload['type'] === 'error');
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
  const firstEvent = sorted[0];
  const lastEvent = sorted[sorted.length - 1];
  const totalMs =
    sorted.length >= 2 && firstEvent && lastEvent
      ? new Date(lastEvent.timestamp).getTime() -
        new Date(firstEvent.timestamp).getTime()
      : 0;

  let lostMs = 0;
  const lostEvents = sorted.filter(
    e => e.tipo === 'focus_lost' || e.tipo === 'visibility.lost',
  );
  for (const lost of lostEvents) {
    const lostTime = new Date(lost.timestamp).getTime();
    const nextGained = sorted.find(
      e => (e.tipo === 'focus_gained' || e.tipo === 'visibility.gained') &&
           new Date(e.timestamp).getTime() > lostTime,
    );
    if (nextGained) {
      const dt = new Date(nextGained.timestamp).getTime() - lostTime;
      if (dt > 0) lostMs += dt;
    }
  }
  const stability = totalMs > 0 ? Math.max(0, 1 - lostMs / totalMs) : DEFAULT_STABILITY_SCORE;

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
  const finalKey = finalizedKey(tentativaId);
  const isNew = await redis.set(finalKey, 'pending', {
    nx: true,
    ex: FINALIZING_TTL_SECONDS,
  });
  if (!isNew) {
    log.warn({ tentativaId }, 'Session já finalizada — idempotência garantida');
    return;
  }

  try {
    const state = await redis.get<SessionState>(sessionKey(tentativaId, sessionId));
    if (!state) {
      await redis.del(finalKey);
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

    await redis.set(finalKey, '1', { ex: FINALIZED_TTL_SECONDS });
    await redis.del(sessionKey(tentativaId, sessionId));

    const area = await fetchSimulacaoArea(tentativaId);
    const perfilId = state.perfilId ?? '';

    // Fire-and-forget: não bloqueia o retorno (§7 Telemetria Sagrada)
    void eventBus
      .publishWithOutbox(DomainEventName.TENTATIVA_CONCLUIDA, {
        tentativaId,
        perfilId,
        area,
        score,
      })
      .catch((err: unknown) => {
        void incrementTentativaConcluidaPublishFailure(tentativaId, perfilId).catch((metricErr: unknown) => {
          log.error({ metricErr, tentativaId, perfilId }, 'Falha ao incrementar métrica TENTATIVA_CONCLUIDA');
        });
        log.error({ err, tentativaId, perfilId }, 'Falha ao emitir TENTATIVA_CONCLUIDA');
      });

    log.info({ tentativaId, score }, 'Sessão lab finalizada — score derivado e persistido');
  } catch (err) {
    await redis.del(finalKey);
    throw err;
  }
}

export async function handleLabEvent(event: TelemetriaEvento): Promise<void> {
  const tentativaId =
    typeof event.payload['tentativaId'] === 'string' ? event.payload['tentativaId'] : undefined;
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

import * as Sentry from '@sentry/node';
import { telemetryRedis as redis } from '../../lib/redis.js';

export const RETRY_LIMIT = 5;

const DLQ_KEY = 'telemetry_dlq';
const PROCESSING_QUEUE = 'telemetry_processing_queue';
const RETRY_TTL_SECONDS = 60 * 60 * 24 * 7; // 7d — paralelo a tel:evt:<eventId> (PE-T04)

export async function incrementRetry(eventId: string): Promise<number> {
  const retryKey = `tel:retry:${eventId}`;
  const count = await redis.eval<number>(
    `
local count = redis.call("INCR", KEYS[1])
redis.call("EXPIRE", KEYS[1], ARGV[1])
return count
`,
    [retryKey],
    [RETRY_TTL_SECONDS],
  );
  return count;
}

export async function moveToDlq(
  eventRaw: string,
  reason: string,
  retries: number,
  eventId?: string,
): Promise<void> {
  // D-NC6: persist DLQ entry before removing from processing queue
  await redis.lpush(DLQ_KEY, JSON.stringify({ eventRaw, reason, retries, movedAt: new Date().toISOString() }));
  await redis.lrem(PROCESSING_QUEUE, 1, eventRaw);

  Sentry.captureMessage('telemetry-poison-pill', {
    level: 'error',
    extra: { ...(eventId !== undefined && { eventId }), reason, retries },
  });
}

export async function clearRetries(eventId: string): Promise<void> {
  await redis.del(`tel:retry:${eventId}`);
}

import pino from 'pino';
import { redis } from '../lib/redis.js';
import { processTelemetryQueue } from '../modules/telemetria/consumer.js';

const log = pino({ name: 'telemetry-worker' });

const HEARTBEAT_KEY = 'telemetry:worker:heartbeat';
const HEARTBEAT_INTERVAL_MS = 30_000;
const HEARTBEAT_TTL_S = 120;

let shuttingDown = false;

async function writeHeartbeat(): Promise<void> {
  try {
    await redis.set(HEARTBEAT_KEY, new Date().toISOString(), { ex: HEARTBEAT_TTL_S });
  } catch (err) {
    log.warn({ err }, 'Heartbeat Redis falhou');
  }
}

const heartbeatTimer = setInterval(() => {
  void writeHeartbeat();
}, HEARTBEAT_INTERVAL_MS);

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  log.info({ signal }, 'Telemetry worker a encerrar gracefully');
  clearInterval(heartbeatTimer);
  try {
    await redis.del(HEARTBEAT_KEY);
  } catch (err) {
    log.warn({ err }, 'Falha ao remover heartbeat Redis no shutdown');
  }
  process.exit(0);
}

process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
process.on('SIGINT', () => { void shutdown('SIGINT'); });

log.info('Telemetry worker iniciado');
void writeHeartbeat();

processTelemetryQueue().catch((err: unknown) => {
  log.fatal({ err }, 'Telemetry worker terminou inesperadamente');
  process.exit(1);
});

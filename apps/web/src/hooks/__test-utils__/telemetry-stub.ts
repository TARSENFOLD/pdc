import { TelemetriaEventoSchema, type TelemetriaEvento, type TelemetriaTipo } from '@pdc/shared';
import { precisionTime } from '@/lib/utils/time';

/**
 * Cria um evento de telemetria válido conforme o schema oficial.
 * Útil para testes de caracterização do useTelemetry.
 */
export function createTelemetryStub(overrides: Partial<TelemetriaEvento> = {}): TelemetriaEvento {
  const stub: TelemetriaEvento = {
    eventId: crypto.randomUUID(),
    tipo: 'session.started' as TelemetriaTipo,
    payload: {},
    timestamp: new Date().toISOString(),
    clientTimestamp: precisionTime.now(),
    sessionId: 'test-session',
    url: 'http://localhost:3000/app',
    visibilityState: 'visible',
    ...overrides,
  };

  // Validação real contra o schema (Zero Mocks de Schema)
  const result = TelemetriaEventoSchema.safeParse(stub);
  if (!result.success) {
    throw new Error(`Invalid Telemetry Stub: ${JSON.stringify(result.error.format())}`);
  }

  return result.data;
}

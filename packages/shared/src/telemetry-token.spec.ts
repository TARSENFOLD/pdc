import { describe, expect, it } from 'vitest';
import { TelemetryTokenPayloadSchema } from './telemetry-token';

describe('TelemetryTokenPayloadSchema', () => {
  it('deve validar um payload correcto', () => {
    const payload = {
      sub: 'user-123',
      perfilId: 'perfil-456',
      iss: 'pdc-v2-bff',
      aud: 'pdc-v2-edge',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    };

    const result = TelemetryTokenPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('deve rejeitar um payload com audience errada', () => {
    const payload = {
      sub: 'user-123',
      perfilId: 'perfil-456',
      iss: 'pdc-v2-bff',
      aud: 'pdc-wrong-edge',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    };

    const result = TelemetryTokenPayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';

const originalNodeEnv = process.env.NODE_ENV;
const originalLongAuth = process.env.PDC_E2E_LONG_AUTH;

async function loadConstants(nodeEnv: string | undefined, longAuth: string | undefined) {
  vi.resetModules();
  if (nodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = nodeEnv;
  if (longAuth === undefined) delete process.env.PDC_E2E_LONG_AUTH;
  else process.env.PDC_E2E_LONG_AUTH = longAuth;
  return import('./auth.constants.js');
}

afterEach(() => {
  vi.resetModules();
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
  if (originalLongAuth === undefined) delete process.env.PDC_E2E_LONG_AUTH;
  else process.env.PDC_E2E_LONG_AUTH = originalLongAuth;
});

describe('auth token TTL guard', () => {
  it.each([undefined, '', 'staging', 'production'])(
    'mantém 15 minutos fora de ambientes E2E aprovados (%s)',
    async (nodeEnv) => {
      const constants = await loadConstants(nodeEnv, 'true');

      expect(constants.ACCESS_TOKEN_TTL).toBe('15m');
      expect(constants.ACCESS_TOKEN_MAX_AGE_SECONDS).toBe(15 * 60);
    },
  );

  it.each(['test', 'development'])(
    'permite 2 horas apenas em %s com opt-in explícito',
    async (nodeEnv) => {
      const constants = await loadConstants(nodeEnv, 'true');

      expect(constants.ACCESS_TOKEN_TTL).toBe('2h');
      expect(constants.ACCESS_TOKEN_MAX_AGE_SECONDS).toBe(2 * 60 * 60);
    },
  );
});

import { describe, expect, it, vi } from 'vitest';
import type { Context, Next } from 'hono';

const registerWithRoleMock = vi.hoisted(() => vi.fn());

vi.mock('../modules/auth/auth.service.js', () => ({
  authService: {
    registerWithRole: registerWithRoleMock,
  },
}));

vi.mock('../modules/feature-flags/feature-flags.service.js', () => ({
  featureFlagService: {
    isEnabled: vi.fn().mockResolvedValue(false),
  },
}));

vi.mock('../middleware/rateLimit.js', () => ({
  rateLimitRegisto: async (_c: Context, next: Next) => {
    await next();
  },
}));

vi.mock('./auth.otp.js', () => ({
  initiate2faChallenge: vi.fn(),
}));

vi.mock('../modules/instituicoes/instituicao.provision.js', () => ({
  provisionInstituicaoForUser: vi.fn(),
}));

import { registerRoutes } from './auth.register.js';

describe('COR-0001 external creator registration', () => {
  it.each(['/mentor', '/instituicao'])(
    'bloqueia provisioning directo em POST %s',
    async (path) => {
      const response = await registerRoutes.request(path, { method: 'POST' });

      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({
        code: 'EXTERNAL_CREATOR_ONBOARDING_TEMPORARILY_DISABLED',
      });
      expect(registerWithRoleMock).not.toHaveBeenCalled();
    },
  );
});

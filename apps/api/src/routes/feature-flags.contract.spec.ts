import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { featureFlagsRoutes } from './feature-flags.js';
import { featureFlagService } from '../modules/feature-flags/feature-flags.service.js';
import { type AuthVariables } from '../modules/auth/auth.middleware.js';

const authUser = vi.hoisted(() => ({
  id: 'user-1',
  role: 'super_admin' as AuthVariables['user']['role'],
}));

// Mock do auth middleware
vi.mock('../modules/auth/auth.middleware.js', () => ({
  verifyJwt: async (c: { set: (key: string, val: unknown) => void }, next: () => Promise<void>) => {
    c.set('user', { ...authUser });
    await next();
  },
}));

// Mock do service
vi.mock('../modules/feature-flags/feature-flags.service.js', () => ({
  featureFlagService: {
    listAll: vi.fn(),
    updateDefaultStrict: vi.fn(),
    setInstitutionOverride: vi.fn(),
    removeInstitutionOverride: vi.fn(),
  },
}));

describe('Feature Flags Contract', () => {
  let app: Hono<{ Variables: AuthVariables }>;

  beforeEach(() => {
    vi.clearAllMocks();
    authUser.id = 'user-1';
    authUser.role = 'super_admin';
    app = new Hono<{ Variables: AuthVariables }>();
    app.route('/', featureFlagsRoutes);
  });

  it('PUT /defaults/:domain deve retornar 400 para body inválido', async () => {
    const res = await app.request('/defaults/TEST_DOMAIN', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: "not-a-boolean" }),
    });

    expect(res.status).toBe(400);
  });

  it('PUT /defaults/:domain deve retornar 404 para domínio inexistente', async () => {
    vi.mocked(featureFlagService.updateDefaultStrict).mockResolvedValue(null);

    const res = await app.request('/defaults/NON_EXISTENT', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: true }),
    });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Flag não encontrada' });
  });

  it('PUT /defaults/:domain deve retornar 200 para domínio válido', async () => {
    const mockFlag = { id: 1, domain: 'TEST', enabled: true, description: null, overrides: [] };
    vi.mocked(featureFlagService.updateDefaultStrict).mockResolvedValue(mockFlag);

    const res = await app.request('/defaults/TEST', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: true }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(mockFlag);
  });

  it('PUT /institutions/:id/:domain deve retornar 404 para domínio inexistente', async () => {
    vi.mocked(featureFlagService.setInstitutionOverride).mockResolvedValue(null);

    const res = await app.request('/institutions/1/TEST', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: true }),
    });

    expect(res.status).toBe(404);
  });

  it('instituição não pode criar o próprio override de rollout', async () => {
    authUser.role = 'instituicao';

    const res = await app.request('/institutions/1/external_creator_onboarding_enabled', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: true }),
    });

    expect(res.status).toBe(403);
    expect(featureFlagService.setInstitutionOverride).not.toHaveBeenCalled();
  });

  it('rejeita ID institucional inválido antes de alterar o rollout', async () => {
    const res = await app.request('/institutions/not-an-id/external_creator_onboarding_enabled', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: true }),
    });

    expect(res.status).toBe(400);
    expect(featureFlagService.setInstitutionOverride).not.toHaveBeenCalled();
  });

  it('DELETE /institutions/:id/:domain deve retornar 404 para domínio inexistente', async () => {
    vi.mocked(featureFlagService.removeInstitutionOverride).mockResolvedValue(null);

    const res = await app.request('/institutions/1/TEST', {
      method: 'DELETE',
    });

    expect(res.status).toBe(404);
  });
});

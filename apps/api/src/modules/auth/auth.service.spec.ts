import { describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/env.js', () => ({
  env: {
    JWT_SECRET: 'test-secret-mock-safeguard',
    API_URL: 'http://localhost:3000',
    FRONTEND_URL: 'http://localhost:5173',
  },
}));

vi.mock('../../lib/redis.js', () => ({
  redis: { set: vi.fn(), get: vi.fn(), del: vi.fn() },
}));

vi.mock('../strapi/strapi.client.js', () => ({
  strapiGetRaw: vi.fn(),
  strapiPostRaw: vi.fn(),
  strapiGet: vi.fn(),
  strapiPost: vi.fn(),
}));

vi.mock('../reputation/reputation.service.js', () => ({
  getReputacao: vi.fn().mockResolvedValue(0),
  getTier: vi.fn().mockReturnValue('BRONZE'),
}));

import { authService } from './auth.service.js';
import { strapiGetRaw, strapiPostRaw, strapiGet, strapiPost } from '../strapi/strapi.client.js';

const BASE_USER = {
  id: 42,
  email: 'user@pdc.ao',
  username: 'user@pdc.ao',
  role: { name: 'Authenticated' },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const BASE_PERFIL = {
  id: 'perfil-1',
  userId: '42',
  nome: 'Ana Ferreira',
  tipo: 'estudante',
  bio: 'Estudante de Engenharia',
  areasInteresse: ['TECNOLOGIA'],
  conquistas: [],
};

describe('authService.mapStrapiUser — new fields', () => {
  it('maps aprovado from perfil', () => {
    const user = authService.mapStrapiUser(BASE_USER, { ...BASE_PERFIL, aprovado: false });
    expect(user.aprovado).toBe(false);
  });

  it('maps aprovado=true from perfil', () => {
    const user = authService.mapStrapiUser(BASE_USER, { ...BASE_PERFIL, aprovado: true });
    expect(user.aprovado).toBe(true);
  });

  it('maps oauthVerified from perfil', () => {
    const user = authService.mapStrapiUser(BASE_USER, { ...BASE_PERFIL, oauthVerified: true });
    expect(user.oauthVerified).toBe(true);
  });

  it('maps oauthProvider google', () => {
    const user = authService.mapStrapiUser(BASE_USER, { ...BASE_PERFIL, oauthProvider: 'google' });
    expect(user.oauthProvider).toBe('google');
  });

  it('maps oauthProvider linkedin', () => {
    const user = authService.mapStrapiUser(BASE_USER, { ...BASE_PERFIL, oauthProvider: 'linkedin' });
    expect(user.oauthProvider).toBe('linkedin');
  });

  it('ignores unknown oauthProvider', () => {
    const user = authService.mapStrapiUser(BASE_USER, { ...BASE_PERFIL, oauthProvider: 'github' });
    expect(user.oauthProvider).toBeUndefined();
  });

  it('maps onboardingCompleto from perfil', () => {
    const user = authService.mapStrapiUser(BASE_USER, { ...BASE_PERFIL, onboardingCompleto: false });
    expect(user.onboardingCompleto).toBe(false);
  });

  it('leaves new fields undefined when perfil is null', () => {
    const user = authService.mapStrapiUser(BASE_USER, null);
    expect(user.aprovado).toBeUndefined();
    expect(user.oauthVerified).toBeUndefined();
    expect(user.oauthProvider).toBeUndefined();
    expect(user.onboardingCompleto).toBeUndefined();
  });

  it('preserves existing fields unchanged', () => {
    const user = authService.mapStrapiUser(BASE_USER, BASE_PERFIL);
    expect(user.id).toBe('42');
    expect(user.email).toBe('user@pdc.ao');
    expect(user.nome).toBe('Ana Ferreira');
    expect(user.role).toBe('estudante');
    expect(user.perfilId).toBe('perfil-1');
  });
});

describe('authService.findOrCreateUser', () => {
  it('creates OAuth users with a generated password for Strapi users-permissions', async () => {
    vi.mocked(strapiGetRaw)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({ roles: [{ id: 1, name: 'Authenticated', type: 'authenticated' }] })
      .mockResolvedValueOnce(BASE_USER);
    vi.mocked(strapiPostRaw).mockResolvedValueOnce(BASE_USER);
    vi.mocked(strapiPost).mockResolvedValueOnce({ data: { ...BASE_PERFIL }, meta: {} });
    vi.mocked(strapiGet).mockResolvedValueOnce({
      data: [{ ...BASE_PERFIL }],
      meta: { pagination: { page: 1, pageSize: 25, pageCount: 1, total: 1 } },
    });

    await authService.findOrCreateUser('USER@PDC.AO', 'Ana Ferreira');

    expect(strapiPostRaw).toHaveBeenCalledWith('/users', expect.objectContaining({
      email: 'user@pdc.ao',
      username: 'user@pdc.ao',
      confirmed: true,
      role: 1,
      password: expect.any(String) as string,
    }));
  });
});

describe('authService.registerWithRole', () => {
  it('rejects duplicate email before calling Strapi local register', async () => {
    vi.mocked(strapiGetRaw).mockResolvedValueOnce([BASE_USER]);

    await expect(
      authService.registerWithRole('USER@PDC.AO', 'SenhaTeste123', 'Ana Ferreira', 'estudante', {})
    ).rejects.toMatchObject({
      status: 409,
      message: 'Já existe uma conta com este email. Inicia sessão ou usa recuperação de palavra-passe.',
    });

    expect(strapiGetRaw).toHaveBeenCalledWith('/users', {
      'filters[email][$eq]': 'user@pdc.ao',
      'pagination[pageSize]': '1',
    });
    expect(strapiPostRaw).not.toHaveBeenCalledWith('/auth/local/register', expect.anything());
  });
});

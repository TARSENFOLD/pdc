import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono, type Context, type Next } from 'hono';
import { telemetriaRoutes } from './telemetria.js';
import { strapiGet } from '../modules/strapi/strapi.client.js';

const authUser = vi.hoisted(() => ({
  current: { id: 'mentor-user', role: 'mentor', perfilId: 'perfil-mentor' },
}));

vi.mock('../modules/auth/auth.middleware.js', () => ({
  verifyJwt: async (c: Context, next: Next) => {
    c.set('user', authUser.current);
    await next();
  },
}));

vi.mock('../modules/strapi/strapi.client.js', () => ({
  strapiGet: vi.fn(),
  strapiPost: vi.fn(),
}));

vi.mock('../lib/redis.js', () => ({
  hasRedis: false,
  redis: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

function listResponse<T>(data: Array<T & { id: string | number }>) {
  return {
    data,
    meta: { pagination: { page: 1, pageSize: data.length, pageCount: 1, total: data.length } },
  };
}

describe('telemetriaRoutes', () => {
  const app = new Hono().route('/telemetria', telemetriaRoutes);

  beforeEach(() => {
    vi.clearAllMocks();
    authUser.current = { id: 'mentor-user', role: 'mentor', perfilId: 'perfil-mentor' };
  });

  it('bloqueia mentor sem vínculo aprovado ao consultar padrões de outro perfil', async () => {
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([]));

    const response = await app.request('/telemetria/patterns?perfilId=perfil-estudante');

    expect(response.status).toBe(403);
    expect(strapiGet).toHaveBeenCalledWith('/vinculos', expect.objectContaining({
      'filters[status][$eq]': 'aprovado',
      'filters[tipo][$eq]': 'student-mentor',
    }));
    expect(strapiGet).not.toHaveBeenCalledWith('/behavior-patterns', expect.anything());
  });

  it('permite mentor vinculado consultar padrões de estudante', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([{ id: 'v-1' }]))
      .mockResolvedValueOnce(listResponse([{
        id: 'pattern-1',
        patternType: 'focus',
        confidence: 0.9,
      }]));

    const response = await app.request('/telemetria/patterns?perfilId=perfil-estudante');

    expect(response.status).toBe(200);
    expect(strapiGet).toHaveBeenCalledWith('/behavior-patterns', expect.objectContaining({
      'filters[perfil][id][$eq]': 'perfil-estudante',
    }));
  });
});

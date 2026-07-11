import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono, type Context, type Next } from 'hono';
import { conquistaRoutes } from './conquistas.js';
import { strapiGet, strapiPost } from '../modules/strapi/strapi.client.js';

const authUser = vi.hoisted(() => ({
  current: { id: 'user-1', role: 'estudante' },
}));
const publishWithOutboxMock = vi.hoisted(() => vi.fn());

vi.mock('../modules/auth/auth.middleware.js', () => ({
  verifyJwt: async (c: Context, next: Next) => {
    c.set('user', authUser.current);
    await next();
  },
}));

vi.mock('../modules/auth/rbac.middleware.js', () => ({
  checkRole: () => async (_c: Context, next: Next) => {
    await next();
  },
}));

vi.mock('../modules/strapi/strapi.client.js', () => ({
  strapiGet: vi.fn(),
  strapiPost: vi.fn(),
}));

vi.mock('../modules/events/event-bus.js', () => ({
  eventBus: {
    publishWithOutbox: publishWithOutboxMock,
  },
}));

vi.mock('../modules/conquistas/conquistas.engine.js', () => ({
  verificarConquistas: vi.fn(),
}));

function listResponse<T>(data: Array<T & { id: string | number }>) {
  return {
    data,
    meta: { pagination: { page: 1, pageSize: data.length, pageCount: 1, total: data.length } },
  };
}

function singleResponse<T>(data: T & { id: string | number }) {
  return { data, meta: {} };
}

describe('conquistaRoutes', () => {
  const app = new Hono().route('/conquistas', conquistaRoutes);

  beforeEach(() => {
    vi.clearAllMocks();
    authUser.current = { id: 'user-1', role: 'estudante' };
    publishWithOutboxMock.mockResolvedValue({ id: 'event-1' });
    vi.mocked(strapiGet).mockResolvedValue(listResponse([{
      id: 'perfil-1',
      createdAt: '2026-01-01T00:00:00.000Z',
    }]));
    vi.mocked(strapiPost).mockResolvedValue(singleResponse({
      id: 'conquista-1',
      titulo: 'Projeto validado',
      aprovada: true,
    }));
  });

  it('mapeia estudante para tipoAutor legado aluno ao persistir conquista manual', async () => {
    const response = await app.request('/conquistas/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titulo: 'Projeto validado',
        descricao: 'Reconhecimento manual por entrega validada.',
      }),
    });

    expect(response.status).toBe(201);
    expect(strapiPost).toHaveBeenCalledWith('/conquistas', expect.objectContaining({
      tipoAutor: 'aluno',
    }));
  });

  it('mapeia super_admin para tipoAutor plataforma ao persistir conquista manual', async () => {
    authUser.current = { id: 'admin-1', role: 'super_admin' };

    const response = await app.request('/conquistas/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titulo: 'Selo oficial',
        descricao: 'Reconhecimento manual emitido pela plataforma.',
      }),
    });

    expect(response.status).toBe(201);
    expect(strapiPost).toHaveBeenCalledWith('/conquistas', expect.objectContaining({
      tipoAutor: 'plataforma',
    }));
  });
});

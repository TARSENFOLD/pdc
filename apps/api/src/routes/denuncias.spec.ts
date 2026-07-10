import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono, type Context, type Next } from 'hono';
import { denunciaRoutes } from './denuncias.js';
import { strapiPost, strapiPut } from '../modules/strapi/strapi.client.js';
import { DomainEventName } from '../modules/events/types.js';

const publishWithOutboxMock = vi.hoisted(() => vi.fn().mockResolvedValue({ id: 'evt-denuncia-1' }));

vi.mock('../modules/strapi/strapi.client.js', () => ({
  strapiGet: vi.fn(),
  strapiPost: vi.fn(),
  strapiPut: vi.fn(),
}));

vi.mock('../modules/events/event-bus.js', () => ({
  eventBus: { publishWithOutbox: publishWithOutboxMock },
}));

vi.mock('../modules/auth/auth.middleware.js', () => ({
  verifyJwt: async (c: Context, next: Next) => {
    c.set('user', { id: c.req.header('x-test-user') ?? 'user-1', role: c.req.header('x-test-role') ?? 'estudante' });
    await next();
  },
}));

vi.mock('../modules/auth/rbac.middleware.js', () => ({
  checkRole: () => async (_c: Context, next: Next) => { await next(); },
}));

vi.mock('../middleware/rateLimit.js', () => ({
  rateLimitDenuncias: async (_c: Context, next: Next) => { await next(); },
}));

vi.mock('../middleware/audit.js', () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

describe('denunciaRoutes G15 events', () => {
  const app = new Hono().route('/denuncias', denunciaRoutes);

  beforeEach(() => {
    vi.clearAllMocks();
    publishWithOutboxMock.mockResolvedValue({ id: 'evt-denuncia-1' });
  });

  it('POST /denuncias emite DENUNCIA_CRIADA', async () => {
    vi.mocked(strapiPost).mockResolvedValueOnce({ data: { id: 'denuncia-1' }, meta: {} });

    const res = await app.request('/denuncias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-test-user': 'autor-1' },
      body: JSON.stringify({ conteudoId: 'post-1', conteudoTipo: 'post', motivo: 'Conteúdo ofensivo e inadequado.' }),
    });

    expect(res.status).toBe(201);
    expect(publishWithOutboxMock).toHaveBeenCalledWith(DomainEventName.DENUNCIA_CRIADA, {
      autorId: 'autor-1',
      targetType: 'post',
      targetId: 'post-1',
      denunciaId: 'denuncia-1',
    });
  });

  it('PUT /denuncias/:id/resolver emite DENUNCIA_RESOLVIDA', async () => {
    vi.mocked(strapiPut).mockResolvedValueOnce({ data: { id: 'denuncia-1' }, meta: {} });

    const res = await app.request('/denuncias/denuncia-1/resolver', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-test-user': 'moderador-1', 'x-test-role': 'moderador' },
      body: JSON.stringify({ accao: 'avisar', nota: 'Utilizador avisado formalmente.' }),
    });

    expect(res.status).toBe(200);
    expect(publishWithOutboxMock).toHaveBeenCalledWith(DomainEventName.DENUNCIA_RESOLVIDA, {
      denunciaId: 'denuncia-1',
      resolutorId: 'moderador-1',
      acao: 'avisar',
    });
  });
});
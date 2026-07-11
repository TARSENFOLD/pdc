import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { z } from 'zod';
import { DomainEventName } from '@pdc/shared';
import { adminRoutes } from './admin.js';
import { strapiGet, strapiGetRaw, strapiPutRaw } from '../modules/strapi/strapi.client.js';
import { setCanonicalUserRole } from '../modules/auth/internal-account.service.js';
import { writeAuditLog } from '../middleware/audit.js';

const serviceMocks = vi.hoisted(() => ({
  getUserById: vi.fn(),
  publishWithOutbox: vi.fn(),
}));

vi.mock('../modules/auth/auth.middleware.js', () => ({
  verifyJwt: async (
    c: { set: (key: string, value: unknown) => void },
    next: () => Promise<void>,
  ) => {
    c.set('user', { id: 'admin-1', role: 'super_admin' });
    await next();
  },
}));

vi.mock('../modules/strapi/strapi.client.js', () => ({
  strapiGet: vi.fn(),
  strapiGetRaw: vi.fn(),
  strapiPutRaw: vi.fn(),
}));

vi.mock('../modules/auth/internal-account.service.js', () => ({
  setCanonicalUserRole: vi.fn(),
}));

vi.mock('../modules/auth/auth.service.js', () => ({
  authService: {
    getUserById: serviceMocks.getUserById,
  },
}));

vi.mock('../modules/events/event-bus.js', () => ({
  eventBus: {
    publishWithOutbox: serviceMocks.publishWithOutbox,
  },
}));

vi.mock('../middleware/audit.js', () => ({
  writeAuditLog: vi.fn(),
}));

interface PerfilFixture {
  id: string;
  userId: string;
  nome: string;
  tipo: string;
}

const SuspenderPayloadSchema = z.object({
  bloqueado: z.literal(true),
  suspendidoEm: z.string(),
});

describe('adminRoutes internal accounts', () => {
  const app = new Hono().route('/', adminRoutes);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(writeAuditLog).mockResolvedValue();
    serviceMocks.publishWithOutbox.mockResolvedValue({
      id: 'event-1',
      name: DomainEventName.PERFIL_ROLE_ALTERADO,
      payload: {},
      timestamp: '2026-01-01T00:00:00.000Z',
      correlationId: 'event-1',
    });
  });

  it('lista utilizadores usando perfil.tipo como role canónica', async () => {
    vi.mocked(strapiGetRaw).mockResolvedValue([
      {
        id: 7,
        email: 'cientista@pdc.ao',
        username: 'cientista@pdc.ao',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
    vi.mocked(strapiGet<PerfilFixture>).mockResolvedValue({
      data: [{ id: 'perfil-7', userId: '7', nome: 'Cientista PDC', tipo: 'comite_cientifico' }],
      meta: { pagination: { page: 1, pageSize: 1000, pageCount: 1, total: 1 } },
    });

    const response = await app.request('/utilizadores?page=1&pageSize=10');

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      data: [{
        id: '7',
        nome: 'Cientista PDC',
        role: 'comite_cientifico',
        perfilId: 'perfil-7',
      }],
      pagination: { total: 1, page: 1, pageSize: 10, pageCount: 1 },
    });
  });

  it('promove pelo serviço canónico e devolve a sessão atualizada', async () => {
    vi.mocked(setCanonicalUserRole).mockResolvedValue({
      perfilId: 'perfil-9',
      oldRole: 'estudante',
      newRole: 'moderador',
    });
    serviceMocks.getUserById.mockResolvedValue({
      id: '9',
      email: 'moderador@pdc.ao',
      nome: 'Moderador PDC',
      role: 'moderador',
      perfilId: 'perfil-9',
      reputacaoTier: 'BRONZE',
      xp: 0,
      reputacao: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      areasInteresse: [],
      conquistas: [],
    });

    const response = await app.request('/utilizadores/9/role', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'moderador' }),
    });

    expect(response.status).toBe(200);
    expect(setCanonicalUserRole).toHaveBeenCalledWith('9', 'moderador');
    expect(await response.json()).toMatchObject({ id: '9', role: 'moderador' });
  });

  it('audita suspensão de utilizador', async () => {
    vi.mocked(strapiPutRaw).mockResolvedValue({ id: '9', blocked: true });

    const response = await app.request('/utilizadores/9/suspender', {
      method: 'PUT',
      headers: {
        'x-forwarded-for': '203.0.113.10',
        'user-agent': 'vitest',
      },
    });

    expect(response.status).toBe(200);
    const putCall = vi.mocked(strapiPutRaw).mock.calls[0];
    expect(putCall?.[0]).toBe('/users/9');
    expect(SuspenderPayloadSchema.parse(putCall?.[1])).toMatchObject({ bloqueado: true });
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      accao: 'admin_suspender_utilizador',
      recurso: '/users/9',
      ip: '203.0.113.10',
      userAgent: 'vitest',
    }));
  });
});

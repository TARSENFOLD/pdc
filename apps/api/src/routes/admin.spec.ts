import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { z } from 'zod';
import { DomainEventName } from '@pdc/shared';
import { adminRoutes } from './admin.js';
import { strapiGet, strapiGetRaw, strapiPutRaw } from '../modules/strapi/strapi.client.js';
import { setCanonicalUserRole } from '../modules/auth/internal-account.service.js';
import { writeAuditLog } from '../middleware/audit.js';
import { provisionInstituicaoForUser } from '../modules/instituicoes/instituicao.provision.js';

const authUser = vi.hoisted(() => ({
  id: 'admin-1',
  role: 'super_admin',
}));

const serviceMocks = vi.hoisted(() => ({
  getUserById: vi.fn(),
  publishWithOutbox: vi.fn(),
}));

vi.mock('../modules/auth/auth.middleware.js', () => ({
  verifyJwt: async (
    c: { set: (key: string, value: unknown) => void },
    next: () => Promise<void>,
  ) => {
    c.set('user', { ...authUser });
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

vi.mock('../modules/instituicoes/instituicao.provision.js', () => ({
  provisionInstituicaoForUser: vi.fn(),
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
  instituicaoGerida?: { id: string; documentId?: string } | null;
}

const SuspenderPayloadSchema = z.object({
  bloqueado: z.literal(true),
  suspendidoEm: z.string(),
});

describe('adminRoutes internal accounts', () => {
  const app = new Hono().route('/', adminRoutes);

  beforeEach(() => {
    vi.clearAllMocks();
    authUser.id = 'admin-1';
    authUser.role = 'super_admin';
    vi.mocked(writeAuditLog).mockResolvedValue();
    serviceMocks.publishWithOutbox.mockResolvedValue({
      id: 'event-1',
      name: DomainEventName.PERFIL_ROLE_ALTERADO,
      payload: {},
      timestamp: '2026-01-01T00:00:00.000Z',
      correlationId: 'event-1',
    });
  });

  it('expõe a ausência ou presença da associação institucional', async () => {
    vi.mocked(strapiGetRaw).mockResolvedValue([
      { id: 7, email: 'sem-associacao@pdc.ao', createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 8, email: 'associada@pdc.ao', createdAt: '2026-01-01T00:00:00.000Z' },
    ]);
    vi.mocked(strapiGet<PerfilFixture>).mockResolvedValue({
      data: [
        {
          id: 'perfil-7',
          userId: '7',
          nome: 'Instituição sem associação',
          tipo: 'instituicao',
          instituicaoGerida: null,
        },
        {
          id: 'perfil-8',
          userId: '8',
          nome: 'Instituição associada',
          tipo: 'instituicao',
          instituicaoGerida: { id: 'inst-8', documentId: 'inst-doc-8' },
        },
      ],
      meta: { pagination: { page: 1, pageSize: 1000, pageCount: 1, total: 2 } },
    });

    const response = await app.request('/utilizadores?page=1&pageSize=10');
    const body = await response.json() as { data: Array<{ id: string; instituicaoId: string | null }> };

    expect(response.status).toBe(200);
    expect(body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: '7', instituicaoId: null }),
      expect.objectContaining({ id: '8', instituicaoId: 'inst-doc-8' }),
    ]));
    expect(strapiGet).toHaveBeenCalledWith('/perfis', {
      'populate[instituicaoGerida][fields][0]': 'id',
      'populate[instituicaoGerida][fields][1]': 'documentId',
      'pagination[page]': '1',
      'pagination[pageSize]': '1000',
    });
  });

  it('encontra associação institucional além dos primeiros 1.000 perfis', async () => {
    vi.mocked(strapiGetRaw).mockResolvedValue([
      { id: 1001, email: 'associada@pdc.ao', createdAt: '2026-01-01T00:00:00.000Z' },
    ]);
    const firstPage = Array.from({ length: 1000 }, (_, index): PerfilFixture & { id: string } => ({
      id: `perfil-${String(index + 1)}`,
      userId: String(index + 1),
      nome: `Perfil ${String(index + 1)}`,
      tipo: 'estudante',
    }));
    vi.mocked(strapiGet<PerfilFixture>)
      .mockResolvedValueOnce({
        data: firstPage,
        meta: { pagination: { page: 1, pageSize: 1000, pageCount: 2, total: 1001 } },
      })
      .mockResolvedValueOnce({
        data: [{
          id: 'perfil-1001',
          userId: '1001',
          nome: 'Instituição associada',
          tipo: 'instituicao',
          instituicaoGerida: { id: 'inst-1001', documentId: 'inst-doc-1001' },
        }],
        meta: { pagination: { page: 2, pageSize: 1000, pageCount: 2, total: 1001 } },
      });

    const response = await app.request('/utilizadores?page=1&pageSize=10');
    const body = await response.json() as { data: Array<{ id: string; instituicaoId: string | null }> };

    expect(response.status).toBe(200);
    expect(body.data).toEqual([
      expect.objectContaining({ id: '1001', instituicaoId: 'inst-doc-1001' }),
    ]);
    expect(strapiGet).toHaveBeenNthCalledWith(1, '/perfis', expect.objectContaining({
      'pagination[page]': '1',
    }));
    expect(strapiGet).toHaveBeenNthCalledWith(2, '/perfis', expect.objectContaining({
      'pagination[page]': '2',
    }));
  });

  it.each([
    { created: true, expectedStatus: 201 },
    { created: false, expectedStatus: 200 },
  ])(
    'repara associação institucional de forma idempotente (created=$created)',
    async ({ created, expectedStatus }) => {
      serviceMocks.getUserById.mockResolvedValue({
        id: '23',
        email: 'instituicao@pdc.ao',
        nome: 'Instituição PDC',
        role: 'instituicao',
      });
      vi.mocked(provisionInstituicaoForUser).mockResolvedValue({
        instituicao: { id: 'inst-23', documentId: 'inst-doc-23', nome: 'Instituição PDC' },
        created,
      });

      const response = await app.request('/utilizadores/23/reparar-instituicao', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '203.0.113.10',
          'user-agent': 'vitest',
        },
      });

      expect(response.status).toBe(expectedStatus);
      expect(provisionInstituicaoForUser).toHaveBeenCalledWith('23', {
        nome: 'Instituição PDC',
      });
      expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        accao: 'admin_reparar_instituicao',
        recurso: '/users/23/instituicao',
        detalhes: { instituicaoId: 'inst-doc-23', created },
      }));
    },
  );

  it('rejeita reparação de utilizador não institucional', async () => {
    serviceMocks.getUserById.mockResolvedValue({
      id: '9',
      email: 'mentor@pdc.ao',
      nome: 'Mentor PDC',
      role: 'mentor',
    });

    const response = await app.request('/utilizadores/9/reparar-instituicao', {
      method: 'POST',
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: 'UTILIZADOR_NAO_INSTITUCIONAL' });
    expect(provisionInstituicaoForUser).not.toHaveBeenCalled();
  });

  it('preserva falha controlada e retryable do provisionamento', async () => {
    serviceMocks.getUserById.mockResolvedValue({
      id: '23',
      email: 'instituicao@pdc.ao',
      nome: 'Instituição PDC',
      role: 'instituicao',
    });
    vi.mocked(provisionInstituicaoForUser).mockRejectedValue(Object.assign(
      new Error('Instituição criada, mas ligação ao gestor pendente de retry'),
      { status: 503, retryable: true },
    ));

    const response = await app.request('/utilizadores/23/reparar-instituicao', {
      method: 'POST',
    });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: 'Instituição criada, mas ligação ao gestor pendente de retry',
      retryable: true,
    });
    expect(writeAuditLog).not.toHaveBeenCalled();
  });

  it('não confirma reparação quando a auditoria durável falha', async () => {
    serviceMocks.getUserById.mockResolvedValue({
      id: '23',
      email: 'instituicao@pdc.ao',
      nome: 'Instituição PDC',
      role: 'instituicao',
    });
    vi.mocked(provisionInstituicaoForUser).mockResolvedValue({
      instituicao: { id: 'inst-23', documentId: 'inst-doc-23', nome: 'Instituição PDC' },
      created: true,
    });
    vi.mocked(writeAuditLog).mockRejectedValueOnce(new Error('audit indisponível'));

    const response = await app.request('/utilizadores/23/reparar-instituicao', {
      method: 'POST',
    });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: 'Associação reparada, mas auditoria pendente; tenta novamente',
      retryable: true,
    });
    expect(provisionInstituicaoForUser).toHaveBeenCalledOnce();
    expect(writeAuditLog).toHaveBeenCalledOnce();
  });

  it('limita erros inesperados do provisionamento a uma resposta segura', async () => {
    serviceMocks.getUserById.mockResolvedValue({
      id: '23',
      email: 'instituicao@pdc.ao',
      nome: 'Instituição PDC',
      role: 'instituicao',
    });
    vi.mocked(provisionInstituicaoForUser).mockRejectedValue('falha não estruturada');

    const response = await app.request('/utilizadores/23/reparar-instituicao', {
      method: 'POST',
    });

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: 'Falha ao reparar associação institucional',
      retryable: false,
    });
  });

  it('impede instituição de usar a ferramenta administrativa de reparação', async () => {
    authUser.role = 'instituicao';

    const response = await app.request('/utilizadores/23/reparar-instituicao', {
      method: 'POST',
    });

    expect(response.status).toBe(403);
    expect(serviceMocks.getUserById).not.toHaveBeenCalled();
    expect(provisionInstituicaoForUser).not.toHaveBeenCalled();
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

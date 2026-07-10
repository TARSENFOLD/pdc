import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono, type Context, type Next } from 'hono';
import { comiteRoutes } from './comite.js';
import { strapiGet, strapiPut } from '../modules/strapi/strapi.client.js';
import { DomainEventName } from '../modules/events/types.js';
import type { StrapiListResponse } from '@pdc/shared';

interface ComiteFixture {
  id: string | number;
  titulo?: string;
  estado?: string;
  autor?: { id?: string };
}

const publishWithOutboxMock = vi.hoisted(() => vi.fn().mockResolvedValue({ id: 'evt-comite-1' }));

vi.mock('../modules/strapi/strapi.client.js', () => ({
  strapiGet: vi.fn(),
  strapiPut: vi.fn(),
  strapiPost: vi.fn().mockResolvedValue({ data: { id: 'notificacao-1' }, meta: {} }),
}));

vi.mock('../modules/events/event-bus.js', () => ({
  eventBus: { publishWithOutbox: publishWithOutboxMock },
}));

vi.mock('../modules/auth/auth.middleware.js', () => ({
  verifyJwt: async (c: Context, next: Next) => {
    c.set('user', { id: c.req.header('x-test-user') ?? 'comite-1', role: c.req.header('x-test-role') ?? 'comite_cientifico' });
    await next();
  },
}));

vi.mock('../modules/auth/rbac.middleware.js', () => ({
  checkRole: () => async (_c: Context, next: Next) => { await next(); },
}));

vi.mock('../middleware/audit.js', () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

function listResponse<T>(data: Array<T & { id: string | number }>): StrapiListResponse<T> {
  return { data, meta: { pagination: { page: 1, pageSize: data.length, pageCount: 1, total: data.length } } };
}

describe('comiteRoutes G15 events', () => {
  const app = new Hono().route('/comite', comiteRoutes);

  beforeEach(() => {
    vi.clearAllMocks();
    publishWithOutboxMock.mockResolvedValue({ id: 'evt-comite-1' });
  });

  it('emite COMITE_APROVOU ao aprovar conteúdo em review', async () => {
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse<ComiteFixture>([{ id: 'sim-1', titulo: 'Simulação', estado: 'review', autor: { id: 'autor-1' } }]));
    vi.mocked(strapiPut).mockResolvedValueOnce({ data: { id: 'sim-1' }, meta: {} });

    const res = await app.request('/comite/simulacao/sim-1/validar', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-test-user': 'comite-1' },
      body: JSON.stringify({ acao: 'aprovar', parecer: 'Parecer científico suficientemente detalhado.' }),
    });

    expect(res.status).toBe(200);
    expect(publishWithOutboxMock).toHaveBeenCalledWith(DomainEventName.COMITE_APROVOU, {
      targetType: 'simulacao',
      targetId: 'sim-1',
      membroId: 'comite-1',
    });
  });

  it('emite COMITE_REJEITOU ao rejeitar conteúdo em review', async () => {
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse<ComiteFixture>([{ id: 'exp-1', titulo: 'Experiência', estado: 'review', autor: { id: 'autor-1' } }]));
    vi.mocked(strapiPut).mockResolvedValueOnce({ data: { id: 'exp-1' }, meta: {} });

    const res = await app.request('/comite/experiencia/exp-1/validar', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-test-user': 'comite-1' },
      body: JSON.stringify({ acao: 'rejeitar', parecer: 'Parecer científico suficientemente detalhado.' }),
    });

    expect(res.status).toBe(200);
    expect(publishWithOutboxMock).toHaveBeenCalledWith(DomainEventName.COMITE_REJEITOU, {
      targetType: 'experiencia',
      targetId: 'exp-1',
      membroId: 'comite-1',
    });
  });

  it('retorna 200 mesmo quando publicação de evento falha', async () => {
    publishWithOutboxMock.mockRejectedValueOnce(new Error('outbox down'));
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse<ComiteFixture>([{ id: 'sim-2', titulo: 'Simulação', estado: 'review', autor: { id: 'autor-1' } }]));
    vi.mocked(strapiPut).mockResolvedValueOnce({ data: { id: 'sim-2' }, meta: {} });

    const res = await app.request('/comite/simulacao/sim-2/validar', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-test-user': 'comite-1' },
      body: JSON.stringify({ acao: 'aprovar', parecer: 'Parecer científico suficientemente detalhado.' }),
    });

    expect(res.status).toBe(200);
  });
});
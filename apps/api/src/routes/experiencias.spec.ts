import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono, type Context, type Next } from 'hono';
import { experienciaRoutes } from './experiencias.js';
import { strapiGet, strapiPost, strapiPut } from '../modules/strapi/strapi.client.js';
import { DomainEventName } from '../modules/events/types.js';
import type { StrapiListResponse, StrapiSingleResponse } from '@pdc/shared';

const publishWithOutboxMock = vi.hoisted(() => vi.fn().mockResolvedValue({ id: 'evt-1' }));

function listResponse<T>(data: Array<T & { id: string | number }>): StrapiListResponse<T> {
  return {
    data,
    meta: { pagination: { page: 1, pageSize: data.length, pageCount: 1, total: data.length } },
  };
}

function singleResponse<T>(data: T & { id: string | number }): StrapiSingleResponse<T> {
  return { data, meta: {} };
}

vi.mock('../modules/strapi/strapi.client.js', () => ({
  strapiGet: vi.fn(),
  strapiPost: vi.fn(),
  strapiPut: vi.fn(),
}));

vi.mock('../modules/events/event-bus.js', () => ({
  eventBus: { publishWithOutbox: publishWithOutboxMock },
}));

vi.mock('../middleware/requireApproved.js', () => ({
  requireApproved: () => async (_c: Context, next: Next) => { await next(); },
}));

vi.mock('../middleware/rateLimit.js', () => ({
  rateLimitContentCreate: async (_c: Context, next: Next) => { await next(); },
}));

vi.mock('../modules/auth/auth.middleware.js', () => ({
  verifyJwt: async (c: Context, next: Next) => {
    c.set('user', {
      id: c.req.header('x-test-user') ?? 'user-1',
      perfilId: c.req.header('x-test-perfil') ?? c.req.header('x-test-user') ?? 'user-1',
      role: c.req.header('x-test-role') ?? 'estudante',
    });
    await next();
  },
}));

vi.mock('../modules/auth/rbac.middleware.js', () => ({
  checkRole: (roles: string[]) => async (c: Context, next: Next) => {
    const role = c.req.header('x-test-role') ?? 'estudante';
    if (!roles.includes(role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    await next();
  },
}));

describe('experienciaRoutes E2E contracts', () => {
  const app = new Hono().route('/experiencias', experienciaRoutes);

  beforeEach(() => { vi.clearAllMocks(); });

  const expPublicada = {
    id: 'exp-1',
    titulo: 'Medicina Clínica — Imersão',
    descricao: 'Roteiro imersivo de 40h em ambiente hospitalar real.',
    area: 'SAUDE',
    nivel: 'medio',
    modalidade: 'presencial',
    estado: 'published',
    autor: { id: 'inst-1', userId: 'inst-1' },
  };

  // ─── GET / — catálogo público ─────────────────────────────────────────────

  it('GET / retorna catálogo sem autenticação', async () => {
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([expPublicada]));

    const res = await app.request('/experiencias');

    expect(res.status).toBe(200);
    const body = await res.json() as { data: unknown[] };
    expect(body.data).toHaveLength(1);
    // Verifica que o filtro de estado público é aplicado
    expect(strapiGet).toHaveBeenCalledWith('/experiencias', expect.objectContaining({
      'filters[estado][$in]': ['approved', 'published'],
    }));
  });

  // ─── GET /:id — detalhe público ───────────────────────────────────────────

  it('GET /:id retorna experiência publicada sem autenticação', async () => {
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([expPublicada]));

    const res = await app.request('/experiencias/exp-1');

    expect(res.status).toBe(200);
    // Garante que drafts não são expostos: filtro de estado é aplicado
    expect(strapiGet).toHaveBeenCalledWith('/experiencias', expect.objectContaining({
      'filters[id][$eq]': 'exp-1',
      'filters[estado][$in]': ['approved', 'published'],
    }));
  });

  it('GET /:id retorna 404 para experiência draft', async () => {
    // Strapi retorna lista vazia porque o filtro de estado exclui drafts
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([]));

    const res = await app.request('/experiencias/exp-draft');

    expect(res.status).toBe(404);
  });

  // ─── GET /minhas — protegido ──────────────────────────────────────────────

  it('GET /minhas rejeita estudante com 403', async () => {
    const res = await app.request('/experiencias/minhas', {
      headers: { 'x-test-role': 'estudante' },
    });

    expect(res.status).toBe(403);
    expect(strapiGet).not.toHaveBeenCalled();
  });

  it('GET /minhas retorna experiências da instituição', async () => {
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([expPublicada]));

    const res = await app.request('/experiencias/minhas', {
      headers: { 'x-test-user': 'inst-1', 'x-test-role': 'instituicao' },
    });

    expect(res.status).toBe(200);
    expect(strapiGet).toHaveBeenCalledWith('/experiencias', expect.objectContaining({
      'filters[autor][userId][$eq]': 'inst-1',
    }));
  });

  // ─── POST / — criação protegida ───────────────────────────────────────────

  it('POST / cria experiência como draft e dispara evento G15', async () => {
    vi.mocked(strapiPost).mockResolvedValueOnce(singleResponse({
      ...expPublicada,
      id: 'exp-new',
      estado: 'draft',
    }));

    const payload = {
      titulo: expPublicada.titulo,
      descricao: expPublicada.descricao,
      area: expPublicada.area,
      nivel: expPublicada.nivel,
      modalidade: expPublicada.modalidade,
    };

    const res = await app.request('/experiencias', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user': 'inst-1',
        'x-test-role': 'instituicao',
      },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(201);
    expect(strapiPost).toHaveBeenCalledWith('/experiencias', expect.objectContaining({
      estado: 'draft',
      autor: 'inst-1',
    }));
    expect(publishWithOutboxMock).toHaveBeenCalledWith(
      DomainEventName.EXPERIENCIA_CRIADA,
      expect.objectContaining({ experienciaId: 'exp-new', autorId: 'inst-1' }),
    );
  });

  it('POST / rejeita estudante com 403', async () => {
    const res = await app.request('/experiencias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-test-role': 'estudante' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(403);
    expect(strapiPost).not.toHaveBeenCalled();
  });

  // ─── POST /:id/inscrever — inscrição com schema correto ───────────────────

  it('inscreve estudante na collection experiencia-participantes', async () => {
    // 1. experiência existe e está publicada
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([expPublicada]))
      // 2. sem duplicado
      .mockResolvedValueOnce(listResponse([]));

    vi.mocked(strapiPost).mockResolvedValueOnce(singleResponse({ id: 'part-1' }));

    const res = await app.request('/experiencias/exp-1/inscrever', {
      method: 'POST',
      headers: { 'x-test-user': 'estudante-1', 'x-test-role': 'estudante' },
    });

    expect(res.status).toBe(201);
    // Garante uso da collection correta (não /inscricoes que é só para cursos)
    expect(strapiPost).toHaveBeenCalledWith('/experiencia-participantes', {
      estudanteId: 'estudante-1',
      experiencia: 'exp-1',
    });
    expect(publishWithOutboxMock).toHaveBeenCalledWith(
      DomainEventName.EXPERIENCIA_PARTICIPACAO,
      { experienciaId: 'exp-1', estudanteId: 'estudante-1' },
    );
  });

  it('inscrever retorna 409 se estudante já está inscrito', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([expPublicada]))
      .mockResolvedValueOnce(listResponse([{ id: 'part-existing', estudanteId: 'estudante-1' }]));

    const res = await app.request('/experiencias/exp-1/inscrever', {
      method: 'POST',
      headers: { 'x-test-user': 'estudante-1', 'x-test-role': 'estudante' },
    });

    expect(res.status).toBe(409);
    expect(strapiPost).not.toHaveBeenCalled();
    expect(publishWithOutboxMock).not.toHaveBeenCalled();
  });

  it('inscrever retorna 404 para experiência draft ou inexistente', async () => {
    // filtro de estado exclui draft → lista vazia
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([]));

    const res = await app.request('/experiencias/exp-draft/inscrever', {
      method: 'POST',
      headers: { 'x-test-role': 'estudante' },
    });

    expect(res.status).toBe(404);
    expect(strapiPost).not.toHaveBeenCalled();
  });

  // ─── PUT /:id — ownership check com filter correto ────────────────────────

  it('PUT /:id atualiza a experiência da própria instituição', async () => {
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([expPublicada]));
    vi.mocked(strapiPut).mockResolvedValueOnce(singleResponse({ ...expPublicada, titulo: 'Novo Título' }));

    const res = await app.request('/experiencias/exp-1', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user': 'inst-1',
        'x-test-role': 'instituicao',
      },
      body: JSON.stringify({ titulo: 'Novo Título' }),
    });

    expect(res.status).toBe(200);
    // BUG-012: verifica que usa filtro (não endpoint single-entity que retorna objeto não-array)
    expect(strapiGet).toHaveBeenCalledWith('/experiencias', expect.objectContaining({
      'filters[id][$eq]': 'exp-1',
    }));
    expect(strapiPut).toHaveBeenCalledWith('/experiencias/exp-1', { titulo: 'Novo Título' });
  });

  it('PUT /:id rejeita instituição que não é dona com 403', async () => {
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([expPublicada]));

    const res = await app.request('/experiencias/exp-1', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user': 'outra-inst',
        'x-test-role': 'instituicao',
      },
      body: JSON.stringify({ titulo: 'Hack' }),
    });

    expect(res.status).toBe(403);
    expect(strapiPut).not.toHaveBeenCalled();
  });

  // ─── PATCH /:id/estado — transições de estado ─────────────────────────────

  it('PATCH /:id/estado permite instituição submeter para revisão', async () => {
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([{
      ...expPublicada,
      estado: 'draft',
    }]));
    vi.mocked(strapiPut).mockResolvedValueOnce(singleResponse({ id: 'exp-1' }));

    const res = await app.request('/experiencias/exp-1/estado', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user': 'inst-1',
        'x-test-role': 'instituicao',
      },
      body: JSON.stringify({ estado: 'review' }),
    });

    expect(res.status).toBe(200);
    expect(strapiPut).toHaveBeenCalledWith('/experiencias/exp-1', { estado: 'review' });
    expect(publishWithOutboxMock).not.toHaveBeenCalled();
  });

  it('PATCH /:id/estado bloqueia instituição de publicar diretamente', async () => {
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([{
      ...expPublicada,
      estado: 'draft',
    }]));

    const res = await app.request('/experiencias/exp-1/estado', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user': 'inst-1',
        'x-test-role': 'instituicao',
      },
      body: JSON.stringify({ estado: 'published' }),
    });

    expect(res.status).toBe(403);
    expect(strapiPut).not.toHaveBeenCalled();
  });

  it('PATCH /:id/estado dispara evento quando publicado', async () => {
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([{
      ...expPublicada,
      estado: 'approved',
    }]));
    vi.mocked(strapiPut).mockResolvedValueOnce(singleResponse({ id: 'exp-1' }));

    const res = await app.request('/experiencias/exp-1/estado', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user': 'super-1',
        'x-test-role': 'super_admin',
      },
      body: JSON.stringify({ estado: 'published' }),
    });

    expect(res.status).toBe(200);
    expect(publishWithOutboxMock).toHaveBeenCalledWith(
      DomainEventName.EXPERIENCIA_PUBLICADA,
      expect.objectContaining({ experienciaId: 'exp-1' }),
    );
  });
});

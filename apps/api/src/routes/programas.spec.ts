import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono, type Context, type Next } from 'hono';
import type { StrapiListResponse, StrapiSingleResponse } from '@pdc/shared';
import { DomainEventName } from '../modules/events/types.js';
import { strapiDelete, strapiGet, strapiPost, strapiPut } from '../modules/strapi/strapi.client.js';
import { programaRoutes } from './programas.js';
import { featureFlagService } from '../modules/feature-flags/feature-flags.service.js';

const publishWithOutboxMock = vi.hoisted(() => vi.fn().mockResolvedValue({ id: 'evt-programa-1' }));

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
  strapiDelete: vi.fn(),
}));

vi.mock('../modules/events/event-bus.js', () => ({
  eventBus: { publishWithOutbox: publishWithOutboxMock },
}));

vi.mock('../modules/feature-flags/feature-flags.service.js', () => ({
  featureFlagService: {
    isEnabled: vi.fn(),
  },
}));

vi.mock('../middleware/requireApproved.js', () => ({
  requireApproved: () => async (_c: Context, next: Next) => {
    await next();
  },
}));

vi.mock('../middleware/rateLimit.js', () => ({
  rateLimitContentCreate: async (_c: Context, next: Next) => {
    await next();
  },
}));

vi.mock('../modules/auth/auth.middleware.js', () => ({
  verifyJwt: async (c: Context, next: Next) => {
    c.set('user', {
      id: c.req.header('x-test-user') ?? 'user-1',
      role: c.req.header('x-test-role') ?? 'estudante',
    });
    await next();
  },
  optionalJwt: async (c: Context, next: Next) => {
    const userId = c.req.header('x-test-user');
    if (userId) {
      c.set('user', {
        id: userId,
        role: c.req.header('x-test-role') ?? 'estudante',
      });
    }
    await next();
  },
}));

describe('programaRoutes contracts', () => {
  const app = new Hono().route('/programas', programaRoutes);
  const payload = {
    titulo: 'Programa de Engenharia Aplicada',
    proposito: 'Reduzir a distância entre teoria e prática profissional.',
    metodologia: 'Combinar cursos, experiências e simulações orientadas.',
    area: 'ENGENHARIA',
    tipo: 'standard',
    cursosIds: ['curso-1', 'curso-2'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(featureFlagService.isEnabled).mockResolvedValue(true);
    publishWithOutboxMock.mockResolvedValue({ id: 'evt-programa-1' });
  });

  it('cria Programa em draft e preserva o evento transacional no outbox', async () => {
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([{
      id: 'perfil-inst',
      instituicaoGerida: { id: 'instituicao-1', documentId: 'instituicao-doc-1' },
    }]));
    vi.mocked(strapiPost).mockResolvedValueOnce(singleResponse({
      id: 41,
      ...payload,
      estado: 'draft',
    }));

    const response = await app.request('/programas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user': 'instituicao-user',
        'x-test-role': 'instituicao',
      },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(201);
    expect(strapiPost).toHaveBeenCalledWith('/programas', expect.objectContaining({
      cursos: ['curso-1', 'curso-2'],
      estado: 'draft',
      criadorTipo: 'instituicao',
      responsavel: 'perfil-inst',
      instituicao: 'instituicao-doc-1',
    }));
    const postedBody = vi.mocked(strapiPost).mock.calls[0]?.[1];
    if (!postedBody || typeof postedBody !== 'object') {
      throw new Error('Payload Strapi de Programa não foi capturado');
    }
    expect('cursosIds' in postedBody).toBe(false);
    expect(publishWithOutboxMock).toHaveBeenCalledWith(DomainEventName.PROGRAMA_CRIADO, {
      programaId: '41',
      autorId: 'perfil-inst',
      titulo: payload.titulo,
      area: 'ENGENHARIA',
      criadorTipo: 'instituicao',
    });
  });

  it('GET /programas/:id deriva cursosIds e mantém os cursos populados', async () => {
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([{
      id: 'programa-1',
      titulo: payload.titulo,
      estado: 'published',
      cursos: [
        { id: 'curso-1', titulo: 'Curso um' },
        { id: 2, titulo: 'Curso dois' },
      ],
    }]));

    const response = await app.request('/programas/programa-1');
    const result = await response.json() as {
      cursosIds: string[];
      cursos: Array<{ id: string | number; titulo: string }>;
    };

    expect(response.status).toBe(200);
    expect(result.cursosIds).toEqual(['curso-1', '2']);
    expect(result.cursos).toEqual([
      { id: 'curso-1', titulo: 'Curso um' },
      { id: 2, titulo: 'Curso dois' },
    ]);
  });

  it('atualiza e remove relações usando os arrays de IDs do contrato', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([{
        id: 'perfil-inst',
        instituicaoGerida: { id: 'instituicao-1' },
      }]))
      .mockResolvedValueOnce(listResponse([{
        id: 'programa-1',
        titulo: payload.titulo,
        estado: 'draft',
        instituicao: { id: 'instituicao-1' },
      }]))
      .mockResolvedValueOnce(listResponse([{
        id: 'programa-1',
        titulo: payload.titulo,
        estado: 'draft',
        cursos: [],
        experiencias: [{ id: 'experiencia-1' }],
      }]));
    vi.mocked(strapiPut).mockResolvedValueOnce(singleResponse({
      id: 'programa-1',
      titulo: payload.titulo,
      estado: 'draft',
      cursos: [],
      experiencias: [{ id: 'experiencia-1' }],
    }));

    const response = await app.request('/programas/programa-1', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user': 'instituicao-user',
        'x-test-role': 'instituicao',
      },
      body: JSON.stringify({
        cursosIds: [],
        experienciasIds: ['experiencia-1'],
      }),
    });

    expect(response.status).toBe(200);
    expect(strapiPut).toHaveBeenCalledWith('/programas/programa-1', {
      cursos: [],
      experiencias: ['experiencia-1'],
    });
    expect(await response.json()).toEqual(expect.objectContaining({
      cursosIds: [],
      experienciasIds: ['experiencia-1'],
    }));
  });

  it('permite ao criador submeter draft para review e regista a autoridade no histórico', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([{
        id: 'perfil-inst',
        instituicaoGerida: { id: 'instituicao-1' },
      }]))
      .mockResolvedValueOnce(listResponse([{
        id: 'programa-1',
        titulo: payload.titulo,
        estado: 'draft',
        instituicao: { id: 'instituicao-1' },
        historicoEstados: [],
      }]));
    vi.mocked(strapiPut).mockResolvedValueOnce(singleResponse({ id: 'programa-1' }));

    const response = await app.request('/programas/programa-1/estado', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user': 'instituicao-user',
        'x-test-role': 'instituicao',
      },
      body: JSON.stringify({ estado: 'review' }),
    });

    expect(response.status).toBe(200);
    expect(strapiPut).toHaveBeenCalledWith('/programas/programa-1', expect.objectContaining({
      estado: 'review',
      historicoEstados: [
        expect.objectContaining({
          estado: 'review',
          autorId: 'instituicao-user',
        }),
      ],
    }));
  });

  it('recusa transição editorial a uma instituição que não criou o Programa', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([{
        id: 'perfil-outra-inst',
        instituicaoGerida: { id: 'instituicao-outra' },
      }]))
      .mockResolvedValueOnce(listResponse([{
        id: 'programa-1',
        titulo: payload.titulo,
        estado: 'draft',
        instituicao: { id: 'perfil-inst' },
      }]));

    const response = await app.request('/programas/programa-1/estado', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user': 'outra-instituicao-user',
        'x-test-role': 'instituicao',
      },
      body: JSON.stringify({ estado: 'review' }),
    });

    expect(response.status).toBe(403);
    expect(strapiPut).not.toHaveBeenCalled();
    expect(publishWithOutboxMock).not.toHaveBeenCalled();
  });

  it('não aceita documentIds contraditórios mesmo quando os ids numéricos coincidem', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([{
        id: 'perfil-inst',
        instituicaoGerida: { id: '1', documentId: 'instituicao-a' },
      }]))
      .mockResolvedValueOnce(listResponse([{
        id: 'programa-1',
        titulo: payload.titulo,
        estado: 'draft',
        instituicao: { id: '1', documentId: 'instituicao-b' },
      }]));

    const response = await app.request('/programas/programa-1', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user': 'instituicao-user',
        'x-test-role': 'instituicao',
      },
      body: JSON.stringify({ titulo: 'Título revisto' }),
    });

    expect(response.status).toBe(403);
    expect(strapiPut).not.toHaveBeenCalled();
  });

  it('remove a inscrição quando o outbox falha durante a criação', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([{ id: 'perfil-1' }]))
      .mockResolvedValueOnce(listResponse([{ id: 'programa-1', estado: 'published' }]))
      .mockResolvedValueOnce(listResponse([]));
    vi.mocked(strapiPost).mockResolvedValueOnce(singleResponse({
      id: 91,
      documentId: 'inscricao-doc-91',
    }));
    vi.mocked(strapiDelete).mockResolvedValueOnce(undefined);
    publishWithOutboxMock.mockRejectedValueOnce(new Error('outbox indisponível'));

    const response = await app.request('/programas/programa-1/inscricao', {
      method: 'POST',
      headers: { 'x-test-user': 'student-user' },
    });

    expect(response.status).toBe(502);
    expect(strapiDelete).toHaveBeenCalledWith('/inscricoes-programas/inscricao-doc-91');
  });

  it('trata conclusão repetida como idempotente sem publicar outro evento', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([{ id: 'perfil-1' }]))
      .mockResolvedValueOnce(listResponse([{
        id: 91,
        documentId: 'inscricao-doc-91',
        concluido: true,
      }]));

    const response = await app.request('/programas/programa-1/concluir', {
      method: 'POST',
      headers: { 'x-test-user': 'student-user' },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, alreadyCompleted: true });
    expect(strapiPut).not.toHaveBeenCalled();
    expect(publishWithOutboxMock).not.toHaveBeenCalled();
  });

  it('publica a conclusão apenas quando a transição atómica altera a inscrição', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([{ id: 'perfil-1' }]))
      .mockResolvedValueOnce(listResponse([{
        id: 91,
        documentId: 'inscricao-doc-91',
        concluido: false,
      }]));
    vi.mocked(strapiPost).mockResolvedValueOnce(singleResponse({ id: 91, updated: 1 }));

    const response = await app.request('/programas/programa-1/concluir', {
      method: 'POST',
      headers: { 'x-test-user': 'student-user' },
    });

    expect(response.status).toBe(200);
    expect(strapiPost).toHaveBeenCalledWith(
      '/inscricoes-programas/inscricao-doc-91/transicao-conclusao',
      expect.objectContaining({ action: 'complete' }),
    );
    expect(publishWithOutboxMock).toHaveBeenCalledTimes(1);
  });

  it('não duplica evento quando outra conclusão vence a corrida', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([{ id: 'perfil-1' }]))
      .mockResolvedValueOnce(listResponse([{
        id: 91,
        documentId: 'inscricao-doc-91',
        concluido: false,
      }]));
    vi.mocked(strapiPost).mockResolvedValueOnce(singleResponse({ id: 91, updated: 0 }));

    const response = await app.request('/programas/programa-1/concluir', {
      method: 'POST',
      headers: { 'x-test-user': 'student-user' },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, alreadyCompleted: true });
    expect(publishWithOutboxMock).not.toHaveBeenCalled();
  });
});

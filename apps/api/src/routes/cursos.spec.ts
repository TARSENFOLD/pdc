import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono, type Context, type Next } from 'hono';
import { cursoRoutes } from './cursos.js';
import { strapiDelete, strapiGet, strapiPost, strapiPut } from '../modules/strapi/strapi.client.js';
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
  strapiDelete: vi.fn(),
}));

vi.mock('../modules/events/event-bus.js', () => ({
  eventBus: {
    publishWithOutbox: publishWithOutboxMock,
  },
}));

vi.mock('../middleware/requireApproved.js', () => ({
  requireApproved: () => async (_c: Context, next: Next) => {
    await next();
  },
}));

vi.mock('../modules/auth/auth.middleware.js', () => ({
  verifyJwt: async (c: Context, next: Next) => {
    c.set('user', {
      id: c.req.header('x-test-user') ?? 'user-1',
      role: c.req.header('x-test-role') ?? 'estudante',
      perfilId: c.req.header('x-test-perfil') ?? undefined,
    });
    await next();
  },
  // optionalJwt — passa sem user se não houver header de teste
  optionalJwt: async (c: Context, next: Next) => {
    const testUser = c.req.header('x-test-user');
    if (testUser) {
      c.set('user', {
        id: testUser,
        role: c.req.header('x-test-role') ?? 'estudante',
        perfilId: c.req.header('x-test-perfil') ?? undefined,
      });
    }
    await next();
  },
}));

describe('cursoRoutes E2E contracts', () => {
  const app = new Hono().route('/cursos', cursoRoutes);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const payload = {
    titulo: 'Curso de Engenharia Aplicada',
    descricao: 'Percurso prático com teoria e laboratório suficientes para validação.',
    area: 'ENGENHARIA',
    nivel: 'medio',
    visibilidade: 'publico',
    gratuito: true,
    preco: 0,
    regrasAcesso: { minFluidez: 0, minResiliencia: 0, minFoco: 0 },
    estado: 'review',
    modulos: [{
      titulo: 'Módulo Inicial',
      ordem: 1,
      itens: [{ titulo: 'Aula de abertura', tipo: 'texto', conteudo: 'Bem-vindo', ordem: 1 }],
    }],
  };

  it('instituição cria curso em review e não publica direto', async () => {
    vi.mocked(strapiPost)
      .mockResolvedValueOnce(singleResponse({ id: 'curso-1', ...payload, autorId: 'inst-user', estado: 'review' }))
      .mockResolvedValueOnce(singleResponse({ id: 'mod-1', titulo: 'Módulo Inicial', ordem: 1 }))
      .mockResolvedValueOnce(singleResponse({ id: 'item-1', titulo: 'Aula de abertura', tipo: 'texto', ordem: 1 }));

    const res = await app.request('/cursos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user': 'inst-user',
        'x-test-role': 'instituicao',
        'x-test-perfil': 'perfil-inst',
      },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(201);
    expect(strapiPost).toHaveBeenCalledWith('/cursos', expect.objectContaining({
      autorId: 'inst-user',
      autor: 'perfil-inst',
      estado: 'review',
    }));
    expect(publishWithOutboxMock).toHaveBeenCalledWith(DomainEventName.CURSO_SUBMETIDO_COMITE, {
      cursoId: 'curso-1',
      autorId: 'inst-user',
    });
    expect(publishWithOutboxMock).not.toHaveBeenCalledWith(DomainEventName.CURSO_PUBLICADO, expect.anything());
  });

  it('inscreve mentor/instituição/estudante usando relação perfil+curso', async () => {
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([]));
    vi.mocked(strapiPost).mockResolvedValueOnce(singleResponse({
      id: 'insc-1',
      curso: { id: 'curso-1' },
      perfil: { id: 'perfil-1' },
      dataInscricao: '2026-05-15',
      progressoPercentual: 0,
      modulosConcluidos: [],
    }));

    const res = await app.request('/cursos/curso-1/inscricao', {
      method: 'POST',
      headers: { 'x-test-role': 'mentor', 'x-test-perfil': 'perfil-1' },
    });

    expect(res.status).toBe(201);
    expect(strapiPost).toHaveBeenCalledWith('/inscricoes', expect.objectContaining({
      curso: 'curso-1',
      perfil: 'perfil-1',
      role: 'mentor',
      progressoPercentual: 0,
      modulosConcluidos: [],
    }));
  });

  it('lista progresso apenas quando existe inscrição', async () => {
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([]));

    const res = await app.request('/cursos/curso-1/progresso', {
      headers: { 'x-test-role': 'estudante', 'x-test-perfil': 'perfil-1' },
    });

    expect(res.status).toBe(404);
  });

  it('marca item concluído e recalcula progresso', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([{
        id: 'insc-1',
        documentId: 'doc-insc-1',
        dataInscricao: '2026-05-15',
        progressoPercentual: 0,
        modulosConcluidos: [],
      }]))
      .mockResolvedValueOnce(listResponse([{
        id: 'mod-1',
        titulo: 'M',
        ordem: 1,
      }]))
      .mockResolvedValueOnce(listResponse([{
        id: 'item-1',
        titulo: 'Item 1',
        ordem: 1,
      }, {
        id: 'item-2',
        titulo: 'Item 2',
        ordem: 2,
      }]));
    vi.mocked(strapiPut).mockResolvedValueOnce(singleResponse({ id: 'insc-1' }));

    const res = await app.request('/cursos/curso-1/progresso/item-1', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-test-role': 'estudante',
        'x-test-perfil': 'perfil-1',
      },
      body: JSON.stringify({ concluido: true }),
    });

    expect(res.status).toBe(200);
    expect(strapiPut).toHaveBeenCalledWith('/inscricoes/doc-insc-1', expect.objectContaining({
      progressoPercentual: 50,
      modulosConcluidos: [expect.objectContaining({ itemId: 'item-1', concluido: true })],
    }));
    expect(publishWithOutboxMock).toHaveBeenCalledWith(DomainEventName.CURSO_ITEM_CONCLUIDO, {
      cursoId: 'curso-1',
      itemId: 'item-1',
      estudanteId: 'user-1',
    });
  });

  it('sincroniza módulos e itens ao editar curso existente', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([{
        id: 'curso-1',
        titulo: 'Curso antigo',
        autorId: 'mentor-user',
      }]))
      .mockResolvedValueOnce(listResponse([{
        id: 'curso-1',
        documentId: 'doc-curso-1',
      }]))
      .mockResolvedValueOnce(listResponse([{
        id: 'curso-1',
        modulos: [{
          id: 'mod-1',
          documentId: 'doc-mod-1',
          titulo: 'Módulo existente',
          ordem: 1,
          itens: [
            { id: 'item-1', documentId: 'doc-item-1' },
            { id: 'item-removido', documentId: 'doc-item-removido' },
          ],
        }],
      }]));
    vi.mocked(strapiPut)
      .mockResolvedValueOnce(singleResponse({ id: 'curso-1' }))
      .mockResolvedValueOnce(singleResponse({ id: 'mod-1' }))
      .mockResolvedValueOnce(singleResponse({ id: 'item-1' }));
    vi.mocked(strapiPost).mockResolvedValueOnce(singleResponse({ id: 'item-2' }));
    vi.mocked(strapiDelete).mockResolvedValueOnce({});

    const res = await app.request('/cursos/curso-1', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user': 'mentor-user',
        'x-test-role': 'mentor',
        'x-test-perfil': 'perfil-mentor',
      },
      body: JSON.stringify({
        titulo: 'Curso editado',
        modulos: [{
          persistedId: 'doc-mod-1',
          titulo: 'Módulo editado',
          ordem: 1,
          itens: [
            { persistedId: 'doc-item-1', titulo: 'Item editado', tipo: 'texto', conteudo: 'Atualizado', ordem: 1 },
            { titulo: 'Item novo', tipo: 'texto', conteudo: 'Novo', ordem: 2 },
          ],
        }],
      }),
    });

    expect(res.status).toBe(200);
    expect(strapiPut).toHaveBeenCalledWith('/cursos/doc-curso-1', expect.objectContaining({ titulo: 'Curso editado' }));
    expect(strapiDelete).toHaveBeenCalledWith('/modulo-items/doc-item-removido');
    expect(strapiPut).toHaveBeenCalledWith('/modulos/doc-mod-1', expect.objectContaining({ titulo: 'Módulo editado' }));
    expect(strapiPut).toHaveBeenCalledWith('/modulo-items/doc-item-1', expect.objectContaining({ titulo: 'Item editado' }));
    expect(strapiPost).toHaveBeenCalledWith('/modulo-items', expect.objectContaining({ titulo: 'Item novo' }));
    expect(publishWithOutboxMock).toHaveBeenCalledWith(DomainEventName.CURSO_ATUALIZADO, {
      cursoId: 'curso-1',
      autorId: 'mentor-user',
    });
  });
});

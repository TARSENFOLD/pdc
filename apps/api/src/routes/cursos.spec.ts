import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono, type Context, type Next } from 'hono';
import { cursoRoutes } from './cursos.js';
import { strapiDelete, strapiGet, strapiPost, strapiPut } from '../modules/strapi/strapi.client.js';
import { DomainEventName } from '../modules/events/types.js';
import type { StrapiListResponse, StrapiSingleResponse } from '@pdc/shared';
import { featureFlagService } from '../modules/feature-flags/feature-flags.service.js';

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
    vi.mocked(featureFlagService.isEnabled).mockResolvedValue(true);
  });

  it('POST /:id/submeter devolve 503 mesmo numa chamada directa ao BFF', async () => {
    vi.mocked(featureFlagService.isEnabled).mockResolvedValue(false);

    const res = await app.request('/cursos/curso-1/submeter', {
      method: 'POST',
      headers: { 'x-test-user': 'mentor-1', 'x-test-role': 'mentor' },
    });

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({
      error: 'A submissão de conteúdos está temporariamente indisponível.',
      code: 'CONTENT_SUBMISSION_TEMPORARILY_DISABLED',
    });
    expect(strapiGet).not.toHaveBeenCalled();
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

  const approvedCourse = {
    id: 'curso-1',
    documentId: 'doc-curso-1',
    titulo: 'Curso publicado',
    descricao: 'Curso aprovado com versão publicada autoritativa.',
    autorId: 'author-1',
    estado: 'approved',
  };

  it('conta permitida guarda curso como draft sem publicar ou submeter', async () => {
    vi.mocked(strapiPost)
      .mockResolvedValueOnce(singleResponse({
        id: 'curso-1',
        documentId: 'doc-curso-1',
        ...payload,
        autorId: 'inst-user',
        estado: 'draft',
      }))
      .mockResolvedValueOnce(singleResponse({
        id: 'mod-1',
        documentId: 'doc-mod-1',
        titulo: 'Módulo Inicial',
        ordem: 1,
        itens: [],
      }))
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
      estado: 'draft',
    }));
    expect(strapiPost).toHaveBeenCalledWith('/modulos', expect.objectContaining({
      curso: 'doc-curso-1',
    }));
    expect(strapiPost).toHaveBeenCalledWith('/modulo-items', expect.objectContaining({
      modulo: 'doc-mod-1',
    }));
    expect(publishWithOutboxMock).not.toHaveBeenCalledWith(
      DomainEventName.CURSO_SUBMETIDO_COMITE,
      expect.anything(),
    );
    expect(publishWithOutboxMock).not.toHaveBeenCalledWith(DomainEventName.CURSO_PUBLICADO, expect.anything());
  });

  it('QA interno guarda draft mesmo com onboarding externo desligado', async () => {
    vi.mocked(featureFlagService.isEnabled).mockResolvedValue(false);
    vi.mocked(strapiPost)
      .mockResolvedValueOnce(singleResponse({
        id: 'curso-qa',
        documentId: 'doc-curso-qa',
        ...payload,
        autorId: 'qa-user',
        estado: 'draft',
      }))
      .mockResolvedValueOnce(singleResponse({
        id: 'mod-qa',
        documentId: 'doc-mod-qa',
        titulo: 'Módulo Inicial',
        ordem: 1,
        itens: [],
      }))
      .mockResolvedValueOnce(singleResponse({
        id: 'item-qa',
        titulo: 'Aula de abertura',
        tipo: 'texto',
        ordem: 1,
      }));

    const res = await app.request('/cursos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user': 'qa-user',
        'x-test-role': 'super_admin',
        'x-test-perfil': 'perfil-qa',
      },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(201);
    expect(strapiPost).toHaveBeenCalledWith('/cursos', expect.objectContaining({
      autorId: 'qa-user',
      estado: 'draft',
    }));
  });

  it('inscreve mentor/instituição/estudante usando relação perfil+curso', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([approvedCourse]))
      .mockResolvedValueOnce(listResponse([approvedCourse]))
      .mockResolvedValueOnce(listResponse([]))
      .mockResolvedValueOnce(listResponse([]));
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
      curso: 'doc-curso-1',
      perfil: 'perfil-1',
      role: 'mentor',
      progressoPercentual: 0,
      modulosConcluidos: [],
    }));
  });

  it('lista progresso apenas quando existe inscrição', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([approvedCourse]))
      .mockResolvedValueOnce(listResponse([approvedCourse]))
      .mockResolvedValueOnce(listResponse([]))
      .mockResolvedValueOnce(listResponse([]));

    const res = await app.request('/cursos/curso-1/progresso', {
      headers: { 'x-test-role': 'estudante', 'x-test-perfil': 'perfil-1' },
    });

    expect(res.status).toBe(404);
  });

  it('marca item concluído e recalcula progresso', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([approvedCourse]))
      .mockResolvedValueOnce(listResponse([approvedCourse]))
      .mockResolvedValueOnce(listResponse([{
        id: 'insc-1',
        documentId: 'doc-insc-1',
        dataInscricao: '2026-05-15',
        progressoPercentual: 0,
        modulosConcluidos: [],
      }]))
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
      cursoId: 'doc-curso-1',
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
        id: 'mod-1',
        documentId: 'doc-mod-1',
        titulo: 'Módulo existente',
        ordem: 1,
      }]))
      .mockResolvedValueOnce(listResponse([
        {
          id: 'item-1',
          documentId: 'doc-item-1',
          titulo: 'Item existente',
          tipo: 'texto',
          ordem: 1,
        },
        {
          id: 'item-removido',
          documentId: 'doc-item-removido',
          titulo: 'Item removido',
          tipo: 'texto',
          ordem: 2,
        },
      ]));
    vi.mocked(strapiPut)
      .mockResolvedValueOnce(singleResponse({ id: 'curso-1' }))
      .mockResolvedValueOnce(singleResponse({ id: 'mod-1' }))
      .mockResolvedValueOnce(singleResponse({ id: 'item-1' }));
    vi.mocked(strapiPost).mockResolvedValueOnce(singleResponse({ id: 'item-2' }));
    vi.mocked(strapiDelete).mockResolvedValueOnce(undefined);

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

  it('expõe documentId como identidade persistente de módulos e itens', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([{
        id: 'curso-1',
        documentId: 'doc-curso-1',
        titulo: 'Curso',
        descricao: 'Descrição válida do curso.',
        slug: 'curso',
        autorId: 'mentor-user',
        totalHoras: 1,
        estado: 'draft',
        createdAt: '2026-06-14T10:00:00.000Z',
        updatedAt: '2026-06-14T10:00:00.000Z',
      }]))
      .mockResolvedValueOnce(listResponse([]))
      .mockResolvedValueOnce(listResponse([{
        id: 'curso-1',
        documentId: 'doc-curso-1',
        titulo: 'Curso',
        descricao: 'Descrição válida do curso.',
        slug: 'curso',
        autorId: 'mentor-user',
        totalHoras: 1,
        estado: 'draft',
        createdAt: '2026-06-14T10:00:00.000Z',
        updatedAt: '2026-06-14T10:00:00.000Z',
      }]))
      .mockResolvedValueOnce(listResponse([{
        id: 'mod-1',
        documentId: 'doc-mod-1',
        titulo: 'Módulo',
        ordem: 1,
      }]))
      .mockResolvedValueOnce(listResponse([{
        id: 'item-1',
        documentId: 'doc-item-1',
        titulo: 'Item',
        tipo: 'texto',
        ordem: 1,
      }]));

    const res = await app.request('/cursos/curso-1?preview=true', {
      headers: {
        'x-test-user': 'mentor-user',
        'x-test-role': 'mentor',
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { modulos: Array<{ id: string; itens: Array<{ id: string }> }> };
    expect(body.modulos[0]?.id).toBe('doc-mod-1');
    expect(body.modulos[0]?.itens[0]?.id).toBe('doc-item-1');
  });

  it.each(['draft', 'review', 'hidden', 'archived'] as const)(
    'não permite inscrição quando o estado actual é %s',
    async (estado) => {
      vi.mocked(strapiGet)
        .mockResolvedValueOnce(listResponse([{ ...approvedCourse, estado }]))
        .mockResolvedValueOnce(listResponse([]))
        .mockResolvedValueOnce(listResponse([]));

      const res = await app.request('/cursos/curso-1/inscricao', {
        method: 'POST',
        headers: { 'x-test-role': 'estudante', 'x-test-perfil': 'perfil-1' },
      });

      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({
        error: 'Conteúdo não encontrado.',
        code: 'CONTENT_NOT_FOUND',
      });
      expect(strapiPost).not.toHaveBeenCalled();
    },
  );

  it('devolve PREVIEW_ONLY antes de o autor consumir o próprio draft', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([{ ...approvedCourse, estado: 'draft', autorId: 'author-1' }]))
      .mockResolvedValueOnce(listResponse([]))
      .mockResolvedValueOnce(listResponse([]));

    const res = await app.request('/cursos/curso-1/inscricao', {
      method: 'POST',
      headers: {
        'x-test-user': 'author-1',
        'x-test-role': 'mentor',
        'x-test-perfil': 'perfil-author',
      },
    });

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      error: 'Este conteúdo só está disponível em pré-visualização.',
      code: 'PREVIEW_ONLY',
    });
    expect(strapiPost).not.toHaveBeenCalled();
  });

  it('preview explícito do autor não cria inscrição', async () => {
    const draft = { ...approvedCourse, estado: 'draft', autorId: 'author-1' };
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([draft]))
      .mockResolvedValueOnce(listResponse([]))
      .mockResolvedValueOnce(listResponse([draft]))
      .mockResolvedValueOnce(listResponse([]));

    const res = await app.request('/cursos/curso-1?preview=true', {
      headers: { 'x-test-user': 'author-1', 'x-test-role': 'mentor' },
    });

    expect(res.status).toBe(200);
    expect(strapiPost).not.toHaveBeenCalled();
    expect(strapiGet).not.toHaveBeenCalledWith('/inscricoes', expect.anything());
  });

  it('relação existente para curso oculto devolve CONTENT_NOT_AVAILABLE', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([{ ...approvedCourse, estado: 'hidden' }]))
      .mockResolvedValueOnce(listResponse([approvedCourse]))
      .mockResolvedValueOnce(listResponse([{ id: 'insc-1' }]));

    const res = await app.request('/cursos/curso-1/progresso', {
      headers: { 'x-test-role': 'estudante', 'x-test-perfil': 'perfil-1' },
    });

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: 'Este conteúdo já não está disponível.',
      code: 'CONTENT_NOT_AVAILABLE',
    });
  });

  it('lista de inscrições também bloqueia uma relação com curso ocultado', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([{
        id: 'insc-1',
        dataInscricao: '2026-08-01',
        curso: { id: 'curso-1' },
      }]))
      .mockResolvedValueOnce(listResponse([{ ...approvedCourse, estado: 'hidden' }]))
      .mockResolvedValueOnce(listResponse([approvedCourse]));

    const res = await app.request('/cursos/me/inscricoes', {
      headers: { 'x-test-role': 'estudante', 'x-test-perfil': 'perfil-1' },
    });

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: 'Este conteúdo já não está disponível.',
      code: 'CONTENT_NOT_AVAILABLE',
    });
  });

  it('o alias legado /inscrever não contorna a confirmação de publicação', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([{ ...approvedCourse, estado: 'review' }]))
      .mockResolvedValueOnce(listResponse([]))
      .mockResolvedValueOnce(listResponse([]));

    const res = await app.request('/cursos/curso-1/inscrever', {
      method: 'POST',
      headers: { 'x-test-role': 'estudante', 'x-test-perfil': 'perfil-1' },
    });

    expect(res.status).toBe(404);
    expect(strapiPost).not.toHaveBeenCalled();
  });

  it('IDs inexistente e privado têm a mesma resposta pública', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([]))
      .mockResolvedValueOnce(listResponse([]))
      .mockResolvedValueOnce(listResponse([]))
      .mockResolvedValueOnce(listResponse([{ ...approvedCourse, estado: 'draft' }]))
      .mockResolvedValueOnce(listResponse([]))
      .mockResolvedValueOnce(listResponse([]));

    const headers = { 'x-test-role': 'estudante', 'x-test-perfil': 'perfil-1' };
    const missing = await app.request('/cursos/missing/inscricao', { method: 'POST', headers });
    const privateContent = await app.request('/cursos/private/inscricao', { method: 'POST', headers });

    expect(missing.status).toBe(404);
    expect(privateContent.status).toBe(404);
    expect(await missing.json()).toEqual(await privateContent.json());
  });

  it('falha do Strapi não produz sucesso ou empty state falso', async () => {
    vi.mocked(strapiGet).mockRejectedValueOnce(new Error('Strapi indisponível'));

    const res = await app.request('/cursos/curso-1/inscricao', {
      method: 'POST',
      headers: { 'x-test-role': 'estudante', 'x-test-perfil': 'perfil-1' },
    });

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({
      error: 'O serviço de conteúdos está temporariamente indisponível.',
      code: 'DEPENDENCY_UNAVAILABLE',
    });
    expect(strapiPost).not.toHaveBeenCalled();
  });
});

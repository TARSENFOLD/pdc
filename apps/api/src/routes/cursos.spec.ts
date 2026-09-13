import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono, type Context, type Next } from 'hono';
import { z } from 'zod';
import { cursoRoutes } from './cursos.js';
import { strapiDelete, strapiGet, strapiPost, strapiPut } from '../modules/strapi/strapi.client.js';
import { DomainEventName } from '../modules/events/types.js';
import {
  CursoReadinessIssueSchema,
  type StrapiListResponse,
  type StrapiSingleResponse,
} from '@pdc/shared';
import { featureFlagService } from '../modules/feature-flags/feature-flags.service.js';

const publishWithOutboxMock = vi.hoisted(() => vi.fn().mockResolvedValue({ id: 'evt-1' }));
const transitionLockMock = vi.hoisted(() => ({
  acquire: vi.fn(),
  extend: vi.fn(),
  release: vi.fn(),
}));
const CourseNotReadyResponseSchema = z.object({
  code: z.literal('COURSE_NOT_READY'),
  issues: z.array(CursoReadinessIssueSchema),
});
const LockedCourseResponseSchema = z
  .object({
    modulos: z
      .array(
        z
          .object({
            itens: z.array(z.object({ id: z.string() }).passthrough()).min(1),
          })
          .passthrough()
      )
      .min(1),
  })
  .passthrough();

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

vi.mock('../lib/distributed-lock.js', () => ({
  acquireLock: transitionLockMock.acquire,
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
    transitionLockMock.extend.mockResolvedValue(true);
    transitionLockMock.release.mockResolvedValue(true);
    transitionLockMock.acquire.mockResolvedValue({
      key: 'curso:transition:curso-1',
      fencingToken: 1,
      extend: transitionLockMock.extend,
      release: transitionLockMock.release,
    });
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

  it('não submete para revisão um curso sem capa, currículo e conteúdo completos', async () => {
    const incompleteCourse = {
      id: 'curso-1',
      documentId: 'doc-curso-1',
      titulo: 'Curso incompleto',
      descricao: 'Ainda faltam elementos obrigatórios.',
      autorId: 'mentor-1',
      estado: 'draft',
      visibilidade: 'publico',
      gratuito: true,
    };
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([incompleteCourse]))
      .mockResolvedValueOnce(listResponse([incompleteCourse]))
      .mockResolvedValueOnce(listResponse([]));

    const res = await app.request('/cursos/curso-1/submeter', {
      method: 'POST',
      headers: { 'x-test-user': 'mentor-1', 'x-test-role': 'mentor' },
    });

    expect(res.status).toBe(422);
    const body = CourseNotReadyResponseSchema.parse(await res.json());
    expect(body.code).toBe('COURSE_NOT_READY');
    expect(body.issues.map((issue) => issue.path)).toEqual(
      expect.arrayContaining(['capaUrl', 'modulos'])
    );
    expect(strapiPut).not.toHaveBeenCalled();
  });

  it('não submete quando a aula existe mas ainda não tem conteúdo', async () => {
    const incompleteLessonCourse = {
      id: 'curso-1',
      documentId: 'doc-curso-1',
      titulo: 'Curso quase completo',
      descricao: 'A identidade está pronta mas a aula continua vazia.',
      area: 'ENGENHARIA',
      nivel: 'medio',
      thumbnailUrl: 'https://cdn.example.com/capa.webp',
      autorId: 'mentor-1',
      estado: 'draft',
      visibilidade: 'publico',
      gratuito: true,
    };
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([incompleteLessonCourse]))
      .mockResolvedValueOnce(listResponse([incompleteLessonCourse]))
      .mockResolvedValueOnce(
        listResponse([
          {
            id: 'mod-1',
            documentId: 'doc-mod-1',
            titulo: 'Fundamentos',
            ordem: 1,
          },
        ])
      )
      .mockResolvedValueOnce(
        listResponse([
          {
            id: 'item-1',
            documentId: 'doc-item-1',
            titulo: 'Primeira aula',
            tipo: 'texto',
            ordem: 1,
          },
        ])
      );

    const res = await app.request('/cursos/curso-1/submeter', {
      method: 'POST',
      headers: { 'x-test-user': 'mentor-1', 'x-test-role': 'mentor' },
    });

    expect(res.status).toBe(422);
    const body = CourseNotReadyResponseSchema.parse(await res.json());
    expect(body.issues.map((issue) => issue.path)).toContain('modulos.0.itens.0.conteudo');
    expect(strapiPut).not.toHaveBeenCalled();
  });

  it('nem super_admin publica um curso aprovado mas incompleto', async () => {
    const incompleteApprovedCourse = {
      id: 'curso-1',
      documentId: 'doc-curso-1',
      titulo: 'Curso incompleto',
      descricao: 'Ainda faltam elementos obrigatórios.',
      autorId: 'mentor-1',
      estado: 'approved',
      visibilidade: 'publico',
      gratuito: true,
    };
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([incompleteApprovedCourse]))
      .mockResolvedValueOnce(listResponse([incompleteApprovedCourse]))
      .mockResolvedValueOnce(listResponse([]));

    const res = await app.request('/cursos/curso-1/estado', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user': 'admin-1',
        'x-test-role': 'super_admin',
      },
      body: JSON.stringify({ estado: 'published' }),
    });

    expect(res.status).toBe(422);
    const body = CourseNotReadyResponseSchema.parse(await res.json());
    expect(body.issues.map((issue) => issue.path)).toEqual(
      expect.arrayContaining(['capaUrl', 'modulos'])
    );
    expect(strapiPut).not.toHaveBeenCalled();
  });

  it('bloqueia também a transição PATCH direta de draft para review', async () => {
    const incompleteDraft = {
      id: 'curso-1',
      documentId: 'doc-curso-1',
      titulo: 'Curso incompleto',
      descricao: 'Ainda faltam elementos obrigatórios.',
      autorId: 'mentor-1',
      estado: 'draft',
    };
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([incompleteDraft]))
      .mockResolvedValueOnce(listResponse([incompleteDraft]))
      .mockResolvedValueOnce(listResponse([]));

    const res = await app.request('/cursos/curso-1/estado', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user': 'mentor-1',
        'x-test-role': 'mentor',
      },
      body: JSON.stringify({ estado: 'review' }),
    });

    expect(res.status).toBe(422);
    const body = CourseNotReadyResponseSchema.parse(await res.json());
    expect(body.issues.map((issue) => issue.path)).toEqual(
      expect.arrayContaining(['capaUrl', 'modulos'])
    );
    expect(strapiPut).not.toHaveBeenCalled();
  });

  it('recusa a transição para review quando o curso já não está em draft', async () => {
    vi.mocked(strapiGet).mockResolvedValueOnce(
      listResponse([
        {
          id: 'curso-1',
          documentId: 'doc-curso-1',
          titulo: 'Curso já submetido',
          descricao: 'Curso que já saiu do estado de rascunho.',
          autorId: 'mentor-1',
          estado: 'approved',
        },
      ])
    );

    const res = await app.request('/cursos/curso-1/estado', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user': 'mentor-1',
        'x-test-role': 'mentor',
      },
      body: JSON.stringify({ estado: 'review' }),
    });

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'Transição inválida de approved para review' });
    expect(strapiPut).not.toHaveBeenCalled();
  });

  it('submete para revisão quando todos os critérios estão completos', async () => {
    const completeDraft = {
      id: 'curso-1',
      documentId: 'doc-curso-1',
      titulo: 'Curso completo',
      descricao: 'Curso pronto para a validação editorial.',
      area: 'ENGENHARIA',
      nivel: 'medio',
      thumbnailUrl: 'https://cdn.example.com/capa.webp',
      autorId: 'mentor-1',
      estado: 'draft',
      visibilidade: 'publico',
      gratuito: true,
    };
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([completeDraft]))
      .mockResolvedValueOnce(listResponse([completeDraft]))
      .mockResolvedValueOnce(
        listResponse([
          {
            id: 'mod-1',
            documentId: 'doc-mod-1',
            titulo: 'Fundamentos',
            ordem: 1,
          },
        ])
      )
      .mockResolvedValueOnce(
        listResponse([
          {
            id: 'item-1',
            documentId: 'doc-item-1',
            titulo: 'Primeira aula',
            tipo: 'texto',
            conteudo: 'Conteúdo completo da primeira aula.',
            ordem: 1,
          },
        ])
      )
      .mockResolvedValueOnce(listResponse([completeDraft]));
    vi.mocked(strapiPut).mockResolvedValueOnce(singleResponse({ id: 'curso-1', estado: 'review' }));

    const res = await app.request('/cursos/curso-1/submeter', {
      method: 'POST',
      headers: { 'x-test-user': 'mentor-1', 'x-test-role': 'mentor' },
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(strapiPut).toHaveBeenCalledWith(
      '/cursos/doc-curso-1',
      { estado: 'review' },
      { status: 'draft' }
    );
  });

  it('devolve conflito quando outra transição editorial já detém o lock do curso', async () => {
    const completeDraft = {
      id: 'curso-1',
      documentId: 'doc-curso-1',
      titulo: 'Curso completo',
      descricao: 'Curso pronto para a validação editorial.',
      area: 'ENGENHARIA',
      nivel: 'medio',
      thumbnailUrl: 'https://cdn.example.com/capa.webp',
      autorId: 'mentor-1',
      estado: 'draft',
      visibilidade: 'publico',
      gratuito: true,
    };
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([completeDraft]))
      .mockResolvedValueOnce(listResponse([completeDraft]))
      .mockResolvedValueOnce(
        listResponse([{ id: 'mod-1', documentId: 'doc-mod-1', titulo: 'Fundamentos', ordem: 1 }])
      )
      .mockResolvedValueOnce(
        listResponse([
          {
            id: 'item-1',
            documentId: 'doc-item-1',
            titulo: 'Primeira aula',
            tipo: 'texto',
            conteudo: 'Conteúdo completo da primeira aula.',
            ordem: 1,
          },
        ])
      );
    transitionLockMock.acquire.mockResolvedValueOnce(null);

    const res = await app.request('/cursos/curso-1/submeter', {
      method: 'POST',
      headers: { 'x-test-user': 'mentor-1', 'x-test-role': 'mentor' },
    });

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: 'Já existe uma transição editorial em curso para este curso.',
    });
    expect(strapiPut).not.toHaveBeenCalled();
  });

  it('publica a versão Strapi quando o curso aprovado está completo', async () => {
    const completeApproved = {
      id: 'curso-1',
      documentId: 'doc-curso-1',
      titulo: 'Curso completo',
      descricao: 'Curso aprovado e pronto para ficar disponível no catálogo.',
      area: 'ENGENHARIA',
      nivel: 'medio',
      thumbnailUrl: 'https://cdn.example.com/capa.webp',
      autorId: 'mentor-1',
      estado: 'approved',
      visibilidade: 'publico',
      gratuito: true,
    };
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([completeApproved]))
      .mockResolvedValueOnce(listResponse([completeApproved]))
      .mockResolvedValueOnce(
        listResponse([
          {
            id: 'mod-1',
            documentId: 'doc-mod-1',
            titulo: 'Fundamentos',
            ordem: 1,
          },
        ])
      )
      .mockResolvedValueOnce(
        listResponse([
          {
            id: 'item-1',
            documentId: 'doc-item-1',
            titulo: 'Primeira aula',
            tipo: 'texto',
            conteudo: 'Conteúdo completo da primeira aula.',
            ordem: 1,
          },
        ])
      )
      .mockResolvedValueOnce(listResponse([completeApproved]));
    vi.mocked(strapiPut)
      .mockResolvedValueOnce(
        singleResponse({
          ...completeApproved,
          estado: 'approved',
        })
      )
      .mockResolvedValueOnce(
        singleResponse({
          ...completeApproved,
          estado: 'published',
        })
      );

    const res = await app.request('/cursos/curso-1/estado', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user': 'mentor-1',
        'x-test-role': 'mentor',
      },
      body: JSON.stringify({ estado: 'published' }),
    });

    expect(res.status).toBe(200);
    expect(vi.mocked(strapiPut).mock.calls).toEqual([
      ['/cursos/doc-curso-1', { estado: 'published' }, { status: 'draft' }],
      ['/cursos/doc-curso-1', { estado: 'approved' }, { status: 'published' }],
    ]);
    expect(publishWithOutboxMock).toHaveBeenCalledWith(
      DomainEventName.CURSO_PUBLICADO,
      expect.objectContaining({ cursoId: 'curso-1', autorId: 'mentor-1' })
    );
    expect(publishWithOutboxMock.mock.invocationCallOrder[0]).toBeGreaterThan(
      vi.mocked(strapiPut).mock.invocationCallOrder[1] ?? 0
    );
  });

  it('encaminha os filtros aceites para a consulta do catálogo público', async () => {
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([]));

    const res = await app.request(
      '/cursos?categoria=TECNOLOGIA&autorId=mentor-1&page=2&pageSize=20&search=cloud'
    );

    expect(res.status).toBe(200);
    expect(strapiGet).toHaveBeenCalledWith('/cursos', {
      populate: 'autor',
      status: 'published',
      'filters[estado][$eq]': 'approved',
      'pagination[page]': '2',
      'pagination[pageSize]': '20',
      'filters[titulo][$containsi]': 'cloud',
      'filters[area][$eq]': 'TECNOLOGIA',
      'filters[autorId][$eq]': 'mentor-1',
    });
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
    modulos: [
      {
        titulo: 'Módulo Inicial',
        ordem: 1,
        itens: [
          {
            titulo: 'Aula de abertura',
            tipo: 'texto',
            conteudo: 'Bem-vindo',
            imagens: [
              {
                url: 'https://cdn.example.com/abertura.webp',
                alt: 'Estudantes reunidos numa aula',
              },
            ],
            ordem: 1,
          },
        ],
      },
    ],
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
      .mockResolvedValueOnce(
        singleResponse({
          id: 'curso-1',
          documentId: 'doc-curso-1',
          ...payload,
          autorId: 'inst-user',
          estado: 'draft',
        })
      )
      .mockResolvedValueOnce(
        singleResponse({
          id: 'mod-1',
          documentId: 'doc-mod-1',
          titulo: 'Módulo Inicial',
          ordem: 1,
          itens: [],
        })
      )
      .mockResolvedValueOnce(
        singleResponse({ id: 'item-1', titulo: 'Aula de abertura', tipo: 'texto', ordem: 1 })
      );

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
    expect(strapiPost).toHaveBeenCalledWith(
      '/cursos',
      expect.objectContaining({
        autorId: 'inst-user',
        autor: 'perfil-inst',
        estado: 'draft',
      }),
      { status: 'draft' }
    );
    expect(strapiPost).toHaveBeenCalledWith(
      '/modulos',
      expect.objectContaining({
        curso: 'doc-curso-1',
      })
    );
    expect(strapiPost).toHaveBeenCalledWith(
      '/modulo-items',
      expect.objectContaining({
        modulo: 'doc-mod-1',
        imagens: [
          { url: 'https://cdn.example.com/abertura.webp', alt: 'Estudantes reunidos numa aula' },
        ],
      })
    );
    expect(publishWithOutboxMock).not.toHaveBeenCalledWith(
      DomainEventName.CURSO_SUBMETIDO_COMITE,
      expect.anything()
    );
    expect(publishWithOutboxMock).not.toHaveBeenCalledWith(
      DomainEventName.CURSO_PUBLICADO,
      expect.anything()
    );
  });

  it('QA interno guarda draft mesmo com onboarding externo desligado', async () => {
    vi.mocked(featureFlagService.isEnabled).mockResolvedValue(false);
    vi.mocked(strapiPost)
      .mockResolvedValueOnce(
        singleResponse({
          id: 'curso-qa',
          documentId: 'doc-curso-qa',
          ...payload,
          autorId: 'qa-user',
          estado: 'draft',
        })
      )
      .mockResolvedValueOnce(
        singleResponse({
          id: 'mod-qa',
          documentId: 'doc-mod-qa',
          titulo: 'Módulo Inicial',
          ordem: 1,
          itens: [],
        })
      )
      .mockResolvedValueOnce(
        singleResponse({
          id: 'item-qa',
          titulo: 'Aula de abertura',
          tipo: 'texto',
          ordem: 1,
        })
      );

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
    expect(strapiPost).toHaveBeenCalledWith(
      '/cursos',
      expect.objectContaining({
        autorId: 'qa-user',
        estado: 'draft',
      }),
      { status: 'draft' }
    );
  });

  it('inscreve mentor/instituição/estudante usando relação perfil+curso', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([approvedCourse]))
      .mockResolvedValueOnce(listResponse([approvedCourse]))
      .mockResolvedValueOnce(listResponse([]))
      .mockResolvedValueOnce(listResponse([]));
    vi.mocked(strapiPost).mockResolvedValueOnce(
      singleResponse({
        id: 'insc-1',
        curso: { id: 'curso-1' },
        perfil: { id: 'perfil-1' },
        dataInscricao: '2026-05-15',
        progressoPercentual: 0,
        modulosConcluidos: [],
      })
    );

    const res = await app.request('/cursos/curso-1/inscricao', {
      method: 'POST',
      headers: { 'x-test-role': 'mentor', 'x-test-perfil': 'perfil-1' },
    });

    expect(res.status).toBe(201);
    expect(strapiPost).toHaveBeenCalledWith(
      '/inscricoes',
      expect.objectContaining({
        curso: 'doc-curso-1',
        perfil: 'perfil-1',
        role: 'mentor',
        progressoPercentual: 0,
        modulosConcluidos: [],
      })
    );
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
      .mockResolvedValueOnce(
        listResponse([
          {
            id: 'insc-1',
            documentId: 'doc-insc-1',
            dataInscricao: '2026-05-15',
            progressoPercentual: 0,
            modulosConcluidos: [],
          },
        ])
      )
      .mockResolvedValueOnce(
        listResponse([
          {
            id: 'insc-1',
            documentId: 'doc-insc-1',
            dataInscricao: '2026-05-15',
            progressoPercentual: 0,
            modulosConcluidos: [],
          },
        ])
      )
      .mockResolvedValueOnce(
        listResponse([
          {
            id: 'insc-1',
            documentId: 'doc-insc-1',
            dataInscricao: '2026-05-15',
            progressoPercentual: 0,
            modulosConcluidos: [],
          },
        ])
      )
      .mockResolvedValueOnce(
        listResponse([
          {
            id: 'mod-1',
            titulo: 'M',
            ordem: 1,
          },
        ])
      )
      .mockResolvedValueOnce(
        listResponse([
          {
            id: 'item-1',
            titulo: 'Item 1',
            ordem: 1,
          },
          {
            id: 'item-2',
            titulo: 'Item 2',
            ordem: 2,
          },
        ])
      );
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
    expect(strapiPut).toHaveBeenCalledWith(
      '/inscricoes/doc-insc-1',
      expect.objectContaining({
        progressoPercentual: 50,
        modulosConcluidos: [expect.objectContaining({ itemId: 'item-1', concluido: true })],
      })
    );
    expect(strapiGet).toHaveBeenCalledWith('/modulos', {
      'filters[$or][0][curso][documentId][$eq]': 'doc-curso-1',
      sort: 'ordem:asc',
      'pagination[pageSize]': '100',
      'pagination[page]': '1',
    });
    expect(publishWithOutboxMock).toHaveBeenCalledWith(DomainEventName.CURSO_ITEM_CONCLUIDO, {
      cursoId: 'doc-curso-1',
      itemId: 'item-1',
      estudanteId: 'user-1',
    });
  });

  it('não escreve progresso quando outra atualização detém o lock da inscrição', async () => {
    const enrollment = {
      id: 'insc-1',
      documentId: 'doc-insc-1',
      dataInscricao: '2026-05-15',
      progressoPercentual: 0,
      modulosConcluidos: [],
    };
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([approvedCourse]))
      .mockResolvedValueOnce(listResponse([approvedCourse]))
      .mockResolvedValueOnce(listResponse([enrollment]))
      .mockResolvedValueOnce(listResponse([enrollment]));
    transitionLockMock.acquire.mockResolvedValueOnce(null);

    const res = await app.request('/cursos/curso-1/progresso/item-1', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-test-role': 'estudante',
        'x-test-perfil': 'perfil-1',
      },
      body: JSON.stringify({ concluido: true }),
    });

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({
      error: 'O serviço de conteúdos está temporariamente indisponível.',
      code: 'DEPENDENCY_UNAVAILABLE',
    });
    expect(strapiPut).not.toHaveBeenCalled();
  });

  it('sincroniza módulos e itens ao editar curso existente', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(
        listResponse([
          {
            id: 'curso-1',
            titulo: 'Curso antigo',
            autorId: 'mentor-user',
          },
        ])
      )
      .mockResolvedValueOnce(
        listResponse([
          {
            id: 'curso-1',
            documentId: 'doc-curso-1',
          },
        ])
      )
      .mockResolvedValueOnce(
        listResponse([
          {
            id: 'mod-1',
            documentId: 'doc-mod-1',
            titulo: 'Módulo existente',
            ordem: 1,
          },
        ])
      )
      .mockResolvedValueOnce(
        listResponse([
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
        ])
      );
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
        modulos: [
          {
            persistedId: 'doc-mod-1',
            titulo: 'Módulo editado',
            ordem: 1,
            itens: [
              {
                persistedId: 'doc-item-1',
                titulo: 'Item editado',
                tipo: 'texto',
                conteudo: 'Atualizado',
                ordem: 1,
              },
              { titulo: 'Item novo', tipo: 'texto', conteudo: 'Novo', ordem: 2 },
            ],
          },
        ],
      }),
    });

    expect(res.status).toBe(200);
    expect(strapiPut).toHaveBeenCalledWith(
      '/cursos/doc-curso-1',
      expect.objectContaining({ titulo: 'Curso editado' }),
      { status: 'draft' }
    );
    expect(strapiDelete).toHaveBeenCalledWith('/modulo-items/doc-item-removido');
    expect(strapiPut).toHaveBeenCalledWith(
      '/modulos/doc-mod-1',
      expect.objectContaining({ titulo: 'Módulo editado' })
    );
    expect(strapiPut).toHaveBeenCalledWith(
      '/modulo-items/doc-item-1',
      expect.objectContaining({ titulo: 'Item editado' })
    );
    expect(strapiPost).toHaveBeenCalledWith(
      '/modulo-items',
      expect.objectContaining({ titulo: 'Item novo' })
    );
    expect(publishWithOutboxMock).toHaveBeenCalledWith(DomainEventName.CURSO_ATUALIZADO, {
      cursoId: 'curso-1',
      autorId: 'mentor-user',
    });
  });

  it('expõe documentId como identidade persistente de módulos e itens', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(
        listResponse([
          {
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
          },
        ])
      )
      .mockResolvedValueOnce(listResponse([]))
      .mockResolvedValueOnce(
        listResponse([
          {
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
          },
        ])
      )
      .mockResolvedValueOnce(
        listResponse([
          {
            id: 'mod-1',
            documentId: 'doc-mod-1',
            titulo: 'Módulo',
            ordem: 1,
          },
        ])
      )
      .mockResolvedValueOnce(
        listResponse([
          {
            id: 'item-1',
            documentId: 'doc-item-1',
            titulo: 'Item',
            tipo: 'texto',
            ordem: 1,
          },
        ])
      );

    const res = await app.request('/cursos/curso-1?preview=true', {
      headers: {
        'x-test-user': 'mentor-user',
        'x-test-role': 'mentor',
      },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      modulos: Array<{ id: string; itens: Array<{ id: string }> }>;
    };
    expect(body.modulos[0]?.id).toBe('doc-mod-1');
    expect(body.modulos[0]?.itens[0]?.id).toBe('doc-item-1');
  });

  it('não expõe a galeria da aula no detalhe público bloqueado', async () => {
    const published = {
      ...approvedCourse,
      slug: 'curso-publicado',
      totalHoras: 1,
      createdAt: '2026-09-03T10:00:00.000Z',
      updatedAt: '2026-09-03T10:00:00.000Z',
    };
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([published]))
      .mockResolvedValueOnce(listResponse([published]))
      .mockResolvedValueOnce(listResponse([published]))
      .mockResolvedValueOnce(listResponse([{ id: 'mod-1', titulo: 'Módulo', ordem: 1 }]))
      .mockResolvedValueOnce(
        listResponse([
          {
            id: 'item-1',
            titulo: 'Aula protegida',
            tipo: 'texto',
            ordem: 1,
            conteudo: 'Corpo protegido',
            imagens: [{ url: 'https://cdn.example.com/protegida.webp', alt: 'Imagem protegida' }],
          },
        ])
      );

    const res = await app.request('/cursos/curso-1');

    expect(res.status).toBe(200);
    const body = LockedCourseResponseSchema.parse(await res.json());
    const firstModule = body.modulos[0];
    if (!firstModule) throw new Error('Resposta pública sem módulo');
    const firstItem = firstModule.itens[0];
    if (!firstItem) throw new Error('Resposta pública sem aula');
    expect(firstItem).not.toHaveProperty('conteudo');
    expect(firstItem).not.toHaveProperty('imagens');
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
    }
  );

  it('devolve PREVIEW_ONLY antes de o autor consumir o próprio draft', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(
        listResponse([{ ...approvedCourse, estado: 'draft', autorId: 'author-1' }])
      )
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
      .mockResolvedValueOnce(
        listResponse([
          {
            id: 'insc-1',
            dataInscricao: '2026-08-01',
            curso: { id: 'curso-1' },
          },
        ])
      )
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

  it('valida várias inscrições com apenas duas consultas batch de versões dos cursos', async () => {
    const secondCourse = {
      ...approvedCourse,
      id: 'curso-2',
      documentId: 'doc-curso-2',
      titulo: 'Segundo curso publicado',
    };
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(
        listResponse([
          {
            id: 'insc-1',
            dataInscricao: '2026-08-01',
            curso: { id: 'curso-1', documentId: 'doc-curso-1' },
          },
          {
            id: 'insc-2',
            dataInscricao: '2026-08-02',
            curso: { id: 'curso-2', documentId: 'doc-curso-2' },
          },
        ])
      )
      .mockResolvedValueOnce(listResponse([approvedCourse, secondCourse]))
      .mockResolvedValueOnce(listResponse([approvedCourse, secondCourse]));

    const res = await app.request('/cursos/me/inscricoes', {
      headers: { 'x-test-role': 'estudante', 'x-test-perfil': 'perfil-1' },
    });

    expect(res.status).toBe(200);
    expect(strapiGet).toHaveBeenCalledTimes(3);
    expect(strapiGet).toHaveBeenNthCalledWith(
      2,
      '/cursos',
      expect.objectContaining({
        'filters[$or][0][documentId][$in]': ['doc-curso-1', 'doc-curso-2'],
        status: 'draft',
      })
    );
    expect(strapiGet).toHaveBeenNthCalledWith(
      3,
      '/cursos',
      expect.objectContaining({ status: 'published' })
    );
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
    const privateContent = await app.request('/cursos/private/inscricao', {
      method: 'POST',
      headers,
    });

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

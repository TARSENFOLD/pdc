import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono, type Context, type Next } from 'hono';

const mocks = vi.hoisted(() => ({
  user: {
    id: 'student-1',
    role: 'estudante' as 'estudante' | 'mentor' | 'comite_cientifico',
  },
  buildContexto: vi.fn(),
  buscarContextoRelevante: vi.fn(),
  chat: vi.fn(),
  gerarQuiz: vi.fn(),
  indexarConteudo: vi.fn(),
  obterVersoesCurso: vi.fn(),
  obterCursoComModulos: vi.fn(),
  strapiGet: vi.fn(),
}));

vi.mock('../modules/auth/auth.middleware.js', () => ({
  verifyJwt: async (c: Context, next: Next) => {
    c.set('user', mocks.user);
    await next();
  },
}));

vi.mock('../modules/auth/rbac.middleware.js', () => ({
  checkRole: () => async (_c: Context, next: Next) => {
    await next();
  },
}));

vi.mock('../modules/cursos/cursos.service.js', () => ({
  cursosService: {
    obterVersoesCurso: mocks.obterVersoesCurso,
    obterCursoComModulos: mocks.obterCursoComModulos,
  },
}));

vi.mock('../modules/strapi/strapi.client.js', () => ({
  strapiGet: mocks.strapiGet,
}));

vi.mock('../modules/ai/ai.service.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../modules/ai/ai.service.js')>();
  return {
    ...actual,
    aiService: {
      ...actual.aiService,
      buildContexto: mocks.buildContexto,
      chat: mocks.chat,
      gerarQuiz: mocks.gerarQuiz,
    },
  };
});

vi.mock('../modules/ai/ai.rag.js', () => ({
  aiRag: {
    buscarContextoRelevante: mocks.buscarContextoRelevante,
    indexarConteudo: mocks.indexarConteudo,
  },
}));

import { AiContentAccessError } from '../modules/ai/ai.service.js';
import { aiRoutes } from './ai.js';

function courseVersion(
  estado: 'draft' | 'review' | 'approved' | 'hidden' | 'archived',
  options: { authorId?: string; documentId?: string } = {},
) {
  return {
    id: 1,
    documentId: options.documentId ?? 'course-1',
    titulo: 'Curso governado',
    autorId: options.authorId ?? 'author-1',
    estado,
  };
}

function jsonRequest(path: string, body: Record<string, string>): Request {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('COR-0002 AI BFF containment', () => {
  const app = new Hono().route('/ai', aiRoutes);

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user = { id: 'student-1', role: 'estudante' };
    mocks.buildContexto.mockResolvedValue('Contexto pessoal autorizado');
    mocks.buscarContextoRelevante.mockResolvedValue('Contexto RAG autorizado');
    mocks.chat.mockResolvedValue(Response.json({ answer: 'ok' }));
    mocks.gerarQuiz.mockResolvedValue([{ id: 'q1' }]);
    mocks.obterVersoesCurso.mockResolvedValue({
      current: courseVersion('approved'),
      published: courseVersion('approved'),
    });
    mocks.obterCursoComModulos.mockResolvedValue({
      ...courseVersion('approved'),
      modulos: [{ id: 'module-1', documentId: 'module-1' }],
    });
    mocks.strapiGet.mockResolvedValue({ data: [] });
  });

  it('não responde ao chat quando a publicação do contexto RAG não pode ser confirmada', async () => {
    mocks.buscarContextoRelevante.mockRejectedValueOnce(new Error('Strapi indisponível'));

    const response = await app.request(jsonRequest('/ai/chat', {
      message: 'Quero aprender arquitectura',
    }));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: 'O serviço de conteúdos está temporariamente indisponível.',
      code: 'DEPENDENCY_UNAVAILABLE',
    });
    expect(mocks.chat).not.toHaveBeenCalled();
  });

  it.each([
    ['content_not_available', 409, 'CONTENT_NOT_AVAILABLE'],
    ['content_not_found', 404, 'CONTENT_NOT_FOUND'],
    ['preview_only', 403, 'PREVIEW_ONLY'],
    ['dependency_unavailable', 503, 'DEPENDENCY_UNAVAILABLE'],
  ] as const)(
    'transporta a negação tipada %s e não chama o provedor',
    async (decision, status, code) => {
      mocks.buildContexto.mockRejectedValueOnce(new AiContentAccessError(decision));

      const response = await app.request(jsonRequest('/ai/chat', {
        message: 'Usa contexto RAG válido',
      }));

      expect(response.status).toBe(status);
      expect(await response.json()).toMatchObject({ code });
      expect(mocks.buscarContextoRelevante).not.toHaveBeenCalled();
      expect(mocks.chat).not.toHaveBeenCalled();
    },
  );

  it('passa o actor autenticado e somente contextos autorizados ao chat', async () => {
    const response = await app.request(jsonRequest('/ai/chat', {
      message: 'Orientação',
    }));

    expect(response.status).toBe(200);
    expect(mocks.buildContexto).toHaveBeenCalledWith({ id: 'student-1', role: 'estudante' });
    expect(mocks.chat).toHaveBeenCalledWith(
      [{ role: 'user', content: 'Orientação' }],
      'Contexto pessoal autorizado Contexto RAG autorizado',
      false,
    );
  });

  it.each(['draft', 'review', 'hidden', 'archived'] as const)(
    'não gera quiz para Curso em estado %s',
    async (estado) => {
      mocks.obterVersoesCurso.mockResolvedValue({ current: courseVersion(estado) });

      const response = await app.request(jsonRequest('/ai/quiz', {
        cursoId: 'course-1',
        moduloId: 'module-1',
      }));

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: 'Conteúdo não encontrado.',
        code: 'CONTENT_NOT_FOUND',
      });
      expect(mocks.gerarQuiz).not.toHaveBeenCalled();
    },
  );

  it('não gera quiz para estado approved sem versão published', async () => {
    mocks.obterVersoesCurso.mockResolvedValue({ current: courseVersion('approved') });

    const response = await app.request(jsonRequest('/ai/quiz', {
      cursoId: 'course-1',
      moduloId: 'module-1',
    }));

    expect(response.status).toBe(404);
    expect(mocks.gerarQuiz).not.toHaveBeenCalled();
  });

  it('devolve PREVIEW_ONLY ao autor do draft na rota learner', async () => {
    mocks.user = { id: 'author-1', role: 'mentor' };
    mocks.obterVersoesCurso.mockResolvedValue({
      current: courseVersion('draft', { authorId: 'author-1' }),
    });

    const response = await app.request(jsonRequest('/ai/quiz', {
      cursoId: 'course-1',
      moduloId: 'module-1',
    }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: 'Este conteúdo só está disponível em pré-visualização.',
      code: 'PREVIEW_ONLY',
    });
    expect(mocks.gerarQuiz).not.toHaveBeenCalled();
  });

  it('devolve PREVIEW_ONLY ao revisor autorizado na rota learner', async () => {
    mocks.user = { id: 'reviewer-1', role: 'comite_cientifico' };
    mocks.obterVersoesCurso.mockResolvedValue({
      current: courseVersion('review'),
    });

    const response = await app.request(jsonRequest('/ai/quiz', {
      cursoId: 'course-1',
      moduloId: 'module-1',
    }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: 'Este conteúdo só está disponível em pré-visualização.',
      code: 'PREVIEW_ONLY',
    });
    expect(mocks.gerarQuiz).not.toHaveBeenCalled();
  });

  it('mantém ID privado e inexistente indistinguíveis', async () => {
    mocks.obterVersoesCurso
      .mockResolvedValueOnce({ current: courseVersion('draft') })
      .mockResolvedValueOnce({});

    const privateResponse = await app.request(jsonRequest('/ai/quiz', {
      cursoId: 'private-course',
      moduloId: 'module-1',
    }));
    const missingResponse = await app.request(jsonRequest('/ai/quiz', {
      cursoId: 'missing-course',
      moduloId: 'module-1',
    }));

    expect(privateResponse.status).toBe(404);
    expect(missingResponse.status).toBe(404);
    expect(await privateResponse.json()).toEqual(await missingResponse.json());
    expect(mocks.gerarQuiz).not.toHaveBeenCalled();
  });

  it.each(['hidden', 'archived'] as const)(
    'devolve CONTENT_NOT_AVAILABLE quando existe relação com Curso %s',
    async (estado) => {
      mocks.obterVersoesCurso.mockResolvedValue({
        current: courseVersion(estado),
        published: courseVersion('approved'),
      });
      mocks.strapiGet.mockResolvedValue({ data: [{ id: 99 }] });

      const response = await app.request(jsonRequest('/ai/quiz', {
        cursoId: 'course-1',
        moduloId: 'module-1',
      }));

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        error: 'Este conteúdo já não está disponível.',
        code: 'CONTENT_NOT_AVAILABLE',
      });
      expect(mocks.gerarQuiz).not.toHaveBeenCalled();
    },
  );

  it('não gera quiz para módulo ausente ou pertencente a outro Curso', async () => {
    mocks.obterCursoComModulos.mockResolvedValue({
      ...courseVersion('approved'),
      modulos: [{ id: 'module-from-other-course' }],
    });

    const response = await app.request(jsonRequest('/ai/quiz', {
      cursoId: 'course-1',
      moduloId: 'module-1',
    }));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: 'Conteúdo não encontrado.',
      code: 'CONTENT_NOT_FOUND',
    });
    expect(mocks.gerarQuiz).not.toHaveBeenCalled();
  });

  it('gera quiz somente para Curso published e approved com módulo pertencente', async () => {
    const response = await app.request(jsonRequest('/ai/quiz', {
      cursoId: 'course-1',
      moduloId: 'module-1',
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: 'q1' }]);
    expect(mocks.obterCursoComModulos).toHaveBeenCalledWith('course-1', 'published');
    expect(mocks.gerarQuiz).toHaveBeenCalledWith('course-1', 'module-1');
  });

  it('devolve DEPENDENCY_UNAVAILABLE quando o Strapi falha antes do quiz', async () => {
    mocks.obterVersoesCurso.mockRejectedValueOnce(new Error('Strapi indisponível'));

    const response = await app.request(jsonRequest('/ai/quiz', {
      cursoId: 'course-1',
      moduloId: 'module-1',
    }));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: 'O serviço de conteúdos está temporariamente indisponível.',
      code: 'DEPENDENCY_UNAVAILABLE',
    });
    expect(mocks.gerarQuiz).not.toHaveBeenCalled();
  });

  it('devolve 503 quando a indexação não consegue validar dependências', async () => {
    mocks.indexarConteudo.mockRejectedValueOnce(new Error('Strapi indisponível'));

    const response = await app.request('/ai/indexar', { method: 'POST' });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: 'O serviço de conteúdos está temporariamente indisponível.',
      code: 'DEPENDENCY_UNAVAILABLE',
    });
  });
});

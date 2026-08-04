import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono, type Context, type Next } from 'hono';

const mocks = vi.hoisted(() => ({
  buildContexto: vi.fn(),
  buscarContextoRelevante: vi.fn(),
  chat: vi.fn(),
}));

vi.mock('../modules/auth/auth.middleware.js', () => ({
  verifyJwt: async (c: Context, next: Next) => {
    c.set('user', { id: 'student-1', role: 'estudante' });
    await next();
  },
}));

vi.mock('../modules/auth/rbac.middleware.js', () => ({
  checkRole: () => async (_c: Context, next: Next) => {
    await next();
  },
}));

vi.mock('../modules/ai/ai.service.js', () => ({
  aiService: {
    buildContexto: mocks.buildContexto,
    chat: mocks.chat,
  },
}));

vi.mock('../modules/ai/ai.rag.js', () => ({
  aiRag: {
    buscarContextoRelevante: mocks.buscarContextoRelevante,
    indexarConteudo: vi.fn(),
  },
}));

import { aiRoutes } from './ai.js';

describe('COR-0002 AI BFF containment', () => {
  const app = new Hono().route('/ai', aiRoutes);

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.buildContexto.mockResolvedValue('Contexto do estudante');
  });

  it('não responde ao chat quando a publicação do contexto RAG não pode ser confirmada', async () => {
    mocks.buscarContextoRelevante.mockRejectedValueOnce(new Error('Strapi indisponível'));

    const response = await app.request('/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Quero aprender arquitectura' }),
    });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: 'O serviço de conteúdos está temporariamente indisponível.',
      code: 'DEPENDENCY_UNAVAILABLE',
    });
    expect(mocks.chat).not.toHaveBeenCalled();
  });
});

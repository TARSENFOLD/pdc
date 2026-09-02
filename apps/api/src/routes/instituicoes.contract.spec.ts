import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { instituicaoRoutes } from './instituicoes.js';
import { strapiGet } from '../modules/strapi/strapi.client.js';
import type { StrapiPerfilGestor } from '../modules/instituicoes/instituicao.types.js';

vi.mock('../modules/auth/auth.middleware.js', () => ({
  verifyJwt: async (
    c: { set: (key: string, value: unknown) => void },
    next: () => Promise<void>,
  ) => {
    c.set('user', { id: 'user-inst-1', role: 'instituicao' });
    await next();
  },
}));

vi.mock('../modules/strapi/strapi.client.js', () => ({
  strapiGet: vi.fn(),
  strapiPost: vi.fn(),
  strapiPut: vi.fn(),
  strapiDelete: vi.fn(),
}));

vi.mock('../modules/media/r2.service.js', () => ({
  uploadToR2: vi.fn(),
}));

vi.mock('../modules/media/file-type-guard.js', () => ({
  validateMagicBytes: vi.fn(),
}));

describe('instituicaoRoutes — associação institucional', () => {
  const app = new Hono().route('/', instituicaoRoutes);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devolve recuperação acionável quando instituicaoGerida está ausente', async () => {
    vi.mocked(strapiGet<StrapiPerfilGestor>).mockResolvedValue({
      data: [{ id: 'perfil-1', userId: 'user-inst-1', instituicaoGerida: null }],
      meta: { pagination: { page: 1, pageSize: 1, pageCount: 1, total: 1 } },
    });

    const response = await app.request('/me');

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: 'O perfil institucional não está associado a uma instituição',
      code: 'INSTITUICAO_ASSOCIACAO_AUSENTE',
      action: 'CONTACTAR_SUPER_ADMIN',
    });
  });
});

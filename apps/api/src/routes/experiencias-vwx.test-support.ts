import { vi } from 'vitest';
import { Hono, type Context, type Next } from 'hono';
import { VWX_SECTION_TYPES, type CriarExperienciaPayload } from '@pdc/shared';
import { experienciaRoutes } from './experiencias.js';
import { strapiGet, strapiPut, strapiPost } from '../modules/strapi/strapi.client.js';
import type { ExperienceRecord } from '../modules/experiencias/experience.service.js';

vi.mock('../modules/strapi/strapi.client.js', () => ({
  strapiGet: vi.fn(),
  strapiPut: vi.fn(),
  strapiPost: vi.fn(),
}));
vi.mock('../modules/events/event-bus.js', () => ({
  eventBus: { publishWithOutbox: vi.fn(() => Promise.resolve({ id: 'event' })) },
}));
vi.mock('../modules/feature-flags/feature-flags.service.js', () => ({
  featureFlagService: { isEnabled: vi.fn(() => Promise.resolve(true)) },
}));
vi.mock('../middleware/requireApproved.js', () => ({
  requireApproved: () => (_c: Context, next: Next) => next(),
}));
vi.mock('../middleware/rateLimit.js', () => ({
  rateLimitContentCreate: (_c: Context, next: Next) => next(),
}));
vi.mock('../lib/distributed-lock.js', () => ({
  acquireLock: vi.fn(() => Promise.resolve({ release: () => Promise.resolve(true) })),
}));
vi.mock('../modules/auth/auth.middleware.js', () => ({
  verifyJwt: async (c: Context, next: Next) => {
    c.set('user', {
      id: c.req.header('x-user') ?? 'learner',
      role: c.req.header('x-role') ?? 'estudante',
      perfilId: 'perfil',
    });
    await next();
  },
}));
vi.mock('../modules/auth/rbac.middleware.js', () => ({
  checkRole: (roles: string[]) => async (c: Context, next: Next) => {
    if (!roles.includes(c.req.header('x-role') ?? 'estudante'))
      return c.json({ error: 'Forbidden' }, 403);
    await next();
  },
}));

export const app = new Hono().route('/experiencias', experienciaRoutes);
export const payload: CriarExperienciaPayload = {
  titulo: 'VWX de produto',
  descricao: 'Diagnóstico de uma jornada de utilizador.',
  tipoExperiencia: 'vwx',
  area: 'TECNOLOGIA',
  nivel: 'basico',
  modalidade: 'online',
  vwx: { profissao: 'Produto', entidade: 'Parceiro de teste', objetivo: 'Um diagnóstico' },
  secoes: VWX_SECTION_TYPES.map((tipo, ordem) => ({
    id: tipo,
    tipo,
    titulo: tipo,
    ordem,
    obrigatoria: true,
    visibilidade: 'publico',
    itens: [
      {
        id: `item-${tipo}`,
        tipo: 'texto',
        titulo: 'Contexto',
        ordem: 0,
        conteudo: 'Conteúdo verificado.',
      },
    ],
  })),
};
export const record: ExperienceRecord = {
  ...payload,
  id: 10,
  documentId: 'doc-vwx',
  slug: 'vwx-produto',
  estado: 'approved',
  gratuito: true,
  validadoAcademicamente: false,
  autor: { userId: 'creator' },
};
export function list<T>(data: T[]) {
  return {
    data,
    meta: { pagination: { total: data.length, page: 1, pageCount: 1, pageSize: 12 } },
  };
}
export function request(path: string, body: unknown, role = 'super_admin', method = 'POST') {
  return app.request(`/experiencias${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-role': role },
    body: JSON.stringify(body),
  });
}

export function resetMocks() {
  vi.mocked(strapiGet).mockReset();
  vi.mocked(strapiPut).mockReset();
  vi.mocked(strapiPost).mockReset();
  vi.mocked(strapiPut).mockResolvedValue({ data: record, meta: {} });
}

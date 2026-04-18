import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { CriarExperienciaPayloadSchema } from '@pdc/shared';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { strapiGet, strapiPost, strapiPut } from '../modules/strapi/strapi.client.js';

type Vars = { Variables: AuthVariables };

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  instituicaoId: z.string().optional(),
});

const atualizarSchema = CriarExperienciaPayloadSchema.partial();

export const experienciaRoutes = new Hono<Vars>();

// ─── Rotas Públicas ──────────────────────────────────────────────────────────

// GET /experiencias — catálogo público
experienciaRoutes.get('/', zValidator('query', listQuerySchema), async (c) => {
  const q = c.req.valid('query');
  const params: Record<string, string> = { 
    populate: 'capa,instituicao,curso',
    'filters[estado][$eq]': 'published'
  };
  
  if (q.page !== undefined) params['pagination[page]'] = q.page.toString();
  if (q.pageSize !== undefined) params['pagination[pageSize]'] = q.pageSize.toString();
  if (q.search !== undefined) params['filters[titulo][$containsi]'] = q.search;
  if (q.instituicaoId !== undefined) params['filters[instituicaoId][$eq]'] = q.instituicaoId;

  try {
    const data = await strapiGet<unknown>('/experiencias', params);
    return c.json(data);
  } catch (err) {
    return c.json({ error: 'Erro ao carregar catálogo de experiências' }, 502);
  }
});

// GET /experiencias/:id — detalhe imersivo
experienciaRoutes.get('/:id', async (c) => {
  const expId = c.req.param('id');
  try {
    const data = await strapiGet<unknown>(`/experiencias/${expId}`, {
      populate: 'capa,instituicao,curso,gradeDestaque',
    });
    return c.json(data);
  } catch (err) {
    return c.json({ error: 'Experiência não encontrada ou indisponível' }, 404);
  }
});

// ─── Rotas Protegidas ─────────────────────────────────────────────────────────

experienciaRoutes.use('*', verifyJwt);

// GET /experiencias/minhas — zona instituição
experienciaRoutes.get('/minhas', checkRole(['instituicao', 'super_admin']), async (c) => {
  const { id: autorId } = c.get('user');
  try {
    const data = await strapiGet<unknown>('/experiencias', {
      'filters[instituicaoId][$eq]': autorId,
      populate: 'capa,instituicao,curso',
      'sort': 'createdAt:desc',
    });
    return c.json(data);
  } catch (err) {
    return c.json({ error: 'Erro ao carregar as tuas experiências' }, 502);
  }
});

// POST /experiencias — criar nova imersão curricular
experienciaRoutes.post(
  '/',
  checkRole(['instituicao', 'super_admin']),
  zValidator('json', CriarExperienciaPayloadSchema),
  async (c) => {
    const { id: instituicaoId } = c.get('user');
    const body = c.req.valid('json');
    
    try {
      const data = await strapiPost<unknown>('/experiencias', {
        ...body,
        instituicaoId,
        autorId: instituicaoId,
        estado: 'draft',
        validadoAcademicamente: false
      });
      return c.json(data, 201);
    } catch (err) {
      return c.json({ error: 'Erro ao criar experiência' }, 502);
    }
  }
);

// PUT /experiencias/:id — editar imersão
experienciaRoutes.put(
  '/:id',
  checkRole(['instituicao', 'super_admin']),
  zValidator('json', atualizarSchema),
  async (c) => {
    const expId = c.req.param('id');
    const { id: userId, role } = c.get('user');
    const body = c.req.valid('json');
    
    try {
      if (role !== 'super_admin') {
        const existing = await strapiGet<{ data?: { attributes?: { instituicaoId?: string } }; instituicaoId?: string }>(`/experiencias/${expId}`);
        const ownerId = existing.data?.attributes?.instituicaoId ?? existing.instituicaoId;
        if (ownerId !== userId) {
          return c.json({ error: 'Sem permissão para editar esta experiência' }, 403);
        }
      }
      const data = await strapiPut<unknown>(`/experiencias/${expId}`, body);
      return c.json(data);
    } catch (err) {
      return c.json({ error: 'Erro ao atualizar experiência' }, 502);
    }
  }
);

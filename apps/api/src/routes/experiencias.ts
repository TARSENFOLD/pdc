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

experienciaRoutes.use('*', verifyJwt);

// GET /experiencias/stats — dashboard instituição stats
experienciaRoutes.get('/stats', checkRole(['instituicao']), async (c) => {
  const { id: instituicaoId } = c.get('user');
  try {
    const [publicadas, inscricoes, programas] = await Promise.all([
      strapiGet<{ meta?: { pagination?: { total?: number } } }>('/experiencias', {
        'filters[instituicaoId][$eq]': instituicaoId,
        'pagination[pageSize]': '1',
      }),
      strapiGet<{ meta?: { pagination?: { total?: number } } }>('/inscricoes-experiencias', {
        'filters[experiencia][instituicaoId][$eq]': instituicaoId,
        'pagination[pageSize]': '1',
      }),
      strapiGet<{ meta?: { pagination?: { total?: number } } }>('/programas', {
        'filters[instituicaoId][$eq]': instituicaoId,
        'filters[activo][$eq]': 'true',
        'pagination[pageSize]': '1',
      }),
    ]);
    return c.json({
      experienciasPublicadas: publicadas?.meta?.pagination?.total ?? 0,
      inscricoesTotais: inscricoes?.meta?.pagination?.total ?? 0,
      programasActivos: programas?.meta?.pagination?.total ?? 0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// GET /experiencias
experienciaRoutes.get('/', zValidator('query', listQuerySchema), async (c) => {
  const q = c.req.valid('query');
  const params: Record<string, string> = { populate: 'capa,instituicao' };
  if (q.page !== undefined) params['pagination[page]'] = q.page.toString();
  if (q.pageSize !== undefined) params['pagination[pageSize]'] = q.pageSize.toString();
  if (q.search !== undefined) params['filters[titulo][$containsi]'] = q.search;
  if (q.instituicaoId !== undefined) params['filters[instituicaoId][$eq]'] = q.instituicaoId;
  try {
    const data = await strapiGet<unknown>('/experiencias', params);
    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// GET /experiencias/minhas — experiências da instituição autenticada
experienciaRoutes.get('/minhas', checkRole(['instituicao', 'super_admin']), async (c) => {
  const { id: autorId } = c.get('user');
  try {
    const data = await strapiGet<unknown>('/experiencias', {
      'filters[instituicaoId][$eq]': autorId,
      populate: 'capa,instituicao',
      'sort': 'createdAt:desc',
    });
    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// GET /experiencias/:id
experienciaRoutes.get('/:id', async (c) => {
  const expId = c.req.param('id');
  try {
    const data = await strapiGet<unknown>(`/experiencias/${expId}`, {
      populate: 'capa,instituicao',
    });
    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// POST /experiencias — instituicao apenas
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
        preco: 0,
      });
      return c.json(data, 201);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro interno';
      return c.json({ error: message }, 502);
    }
  }
);

// PUT /experiencias/:id — instituicao apenas, verifica autorId
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
        const ownerId = existing?.data?.attributes?.instituicaoId ?? existing?.instituicaoId;
        if (ownerId !== userId) {
          return c.json({ error: 'Sem permissão para editar esta experiência' }, 403);
        }
      }
      const data = await strapiPut<unknown>(`/experiencias/${expId}`, { ...body, preco: 0 });
      return c.json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro interno';
      return c.json({ error: message }, 502);
    }
  }
);

// PATCH /experiencias/:id/estado — transição de estado editorial
experienciaRoutes.patch('/:id/estado', checkRole(['instituicao', 'moderador', 'super_admin']), zValidator('json', z.object({
  estado: z.enum(['review', 'published', 'archived']),
})), async (c) => {
  const id = c.req.param('id');
  const { estado } = c.req.valid('json');
  const user = c.get('user');

  try {
    // Buscar experiência actual
    const exp = await strapiGet<any>(`/experiencias/${id}`);
    if (!exp.data) {
      return c.json({ error: 'Experiência não encontrada' }, 404);
    }

    const estadoActual = exp.data.estado;

    // Validar transições permitidas (só instituição pode submeter para review)
    const transicaoPermitida = (actual: string, novo: string, role: string): boolean => {
      if (role === 'super_admin') return true;
      if (role === 'moderador') return novo === 'archived' && actual === 'published';
      if (role === 'instituicao') {
        if (actual === 'draft' && novo === 'review') return true;
        if (actual === 'approved' && novo === 'published') return true;
      }
      return false;
    };

    // Verificar autorização
    const podeEditar = user.id === exp.data.instituicaoId || ['moderador', 'super_admin'].includes(user.role);
    if (!podeEditar) {
      return c.json({ error: 'Sem permissão para editar esta experiência' }, 403);
    }

    if (!transicaoPermitida(estadoActual, estado, user.role)) {
      return c.json({
        error: `Transição inválida de ${estadoActual} para ${estado}`
      }, 400);
    }

    // Actualizar estado
    await strapiPut<unknown>(`/experiencias/${id}`, { estado });

    return c.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});


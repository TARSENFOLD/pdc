import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { CriarProgramaPayloadSchema } from '@pdc/shared';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { strapiGet, strapiPost, strapiPut } from '../modules/strapi/strapi.client.js';

type Vars = { Variables: AuthVariables };

export const programasRoutes = new Hono<Vars>();

// GET /programas — listar programas públicos (acessível sem auth se necessário, mas aqui protegemos com verifyJwt opcional ou padrão)
programasRoutes.get('/', async (c) => {
  try {
    const data = await strapiGet<unknown>('/programas', {
      'filters[estado][$eq]': 'published',
      populate: 'capa,instituicao',
      sort: 'createdAt:desc',
    });
    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

programasRoutes.use('*', verifyJwt);

// GET /programas/meus — listar programas da instituição
programasRoutes.get('/meus', checkRole(['instituicao', 'super_admin']), async (c) => {
  const { id: autorId } = c.get('user');
  try {
    const data = await strapiGet<unknown>('/programas', {
      'filters[autorId][$eq]': autorId,
      populate: 'capa',
      sort: 'createdAt:desc',
    });
    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// POST /programas — criar programa
programasRoutes.post(
  '/',
  checkRole(['instituicao', 'super_admin']),
  zValidator('json', CriarProgramaPayloadSchema),
  async (c) => {
    const { id: autorId } = c.get('user');
    const body = c.req.valid('json');
    try {
      const data = await strapiPost<unknown>('/programas', {
        ...body,
        autorId,
        instituicaoId: autorId,
        estado: 'draft',
      });
      return c.json(data, 201);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro interno';
      return c.json({ error: message }, 502);
    }
  }
);

// PUT /programas/:id — editar programa próprio
programasRoutes.put(
  '/:id',
  checkRole(['instituicao', 'super_admin']),
  zValidator('json', CriarProgramaPayloadSchema.partial()),
  async (c) => {
    const id = c.req.param('id');
    const { id: userId, role } = c.get('user');
    const body = c.req.valid('json');
    try {
      if (role !== 'super_admin') {
        const existing = await strapiGet<{ data?: { attributes?: { autorId?: string } }; autorId?: string }>(`/programas/${id}`);
        const ownerId = existing?.data?.attributes?.autorId ?? existing?.autorId;
        if (ownerId !== userId) {
          return c.json({ error: 'Sem permissão para editar este programa' }, 403);
        }
      }
      const data = await strapiPut<unknown>(`/programas/${id}`, body);
      return c.json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro interno';
      return c.json({ error: message }, 502);
    }
  }
);

const inscricaoSchema = z.object({
  inviteCode: z.string().optional(),
});

// POST /programas/:id/inscricao — estudante inscreve-se num programa
programasRoutes.post(
  '/:id/inscricao',
  checkRole(['aluno', 'super_admin']),
  zValidator('json', inscricaoSchema),
  async (c) => {
    const programaId = c.req.param('id');
    const { id: userId } = c.get('user');
    const { inviteCode } = c.req.valid('json');
    try {
      // Verificar se o programa existe e está publicado
      const programa = await strapiGet<{ estado?: string; inviteCode?: string }>(
        `/programas/${programaId}`,
        { fields: 'estado,inviteCode' },
      );
      if (programa.estado !== 'published') {
        return c.json({ error: 'Programa não disponível para inscrição' }, 404);
      }
      if (programa.inviteCode && programa.inviteCode !== inviteCode) {
        return c.json({ error: 'Código de convite inválido' }, 403);
      }
      // Verificar inscrição duplicada
      const existing = await strapiGet<{ meta: { pagination: { total: number } } }>(
        '/programa-inscricaos',
        {
          'filters[programaId][$eq]': programaId,
          'filters[userId][$eq]': userId,
          'pagination[pageSize]': '1',
        },
      );
      if ((existing.meta?.pagination?.total ?? 0) > 0) {
        return c.json({ error: 'Já inscrito neste programa' }, 409);
      }
      const inscricao = await strapiPost<{ id: string }>('/programa-inscricaos', {
        programaId,
        userId,
        estado: 'pendente',
        inscritoEm: new Date().toISOString(),
      });
      return c.json({ success: true, inscricaoId: String(inscricao.id) }, 201);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro interno';
      return c.json({ error: message }, 502);
    }
  }
);

// GET /programas/:id/participantes — instituição vê lista de inscritos
programasRoutes.get(
  '/:id/participantes',
  checkRole(['instituicao', 'super_admin']),
  async (c) => {
    const programaId = c.req.param('id');
    const { id: userId, role } = c.get('user');
    try {
      // Verificar ownership (admin pode ver qualquer programa)
      if (role !== 'super_admin') {
        const programa = await strapiGet<{ autorId?: string }>(
          `/programas/${programaId}`,
          { fields: 'autorId' },
        );
        if (programa.autorId !== userId) {
          return c.json({ error: 'Sem permissão para este programa' }, 403);
        }
      }
      const data = await strapiGet<unknown>('/programa-inscricaos', {
        'filters[programaId][$eq]': programaId!,
        populate: 'perfil',
        sort: 'createdAt:desc',
      });
      return c.json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro interno';
      return c.json({ error: message }, 502);
    }
  }
);

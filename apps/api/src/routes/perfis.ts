import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { UpdatePerfilPayloadSchema } from '@pdc/shared';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { strapiGet, strapiPutRaw } from '../modules/strapi/strapi.client.js';

type Vars = { Variables: AuthVariables };

interface VinculoData {
  senderId?: string;
  receiverId?: string;
  attributes?: { senderId?: string; receiverId?: string };
}

interface VinculosResponse {
  data?: VinculoData[];
}

export const perfilRoutes = new Hono<Vars>();

perfilRoutes.use('*', verifyJwt);

// GET /perfis/me
perfilRoutes.get('/me', async (c) => {
  const user = c.get('user');
  const id = user.id;
  try {
    const data = await strapiGet<unknown>(`/users/${id}`, {
      populate: 'role,avatar',
    });
    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// PUT /perfis/me
perfilRoutes.put('/me', zValidator('json', UpdatePerfilPayloadSchema), async (c) => {
  const user = c.get('user');
  const id = user.id;
  const body = c.req.valid('json');
  try {
    const data = await strapiPutRaw<unknown>(`/users/${id}`, body);
    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// GET /perfis/me/stats — dashboard aluno stats
perfilRoutes.get('/me/stats', checkRole(['aluno']), async (c) => {
  const user = c.get('user');
  const id = user.id;
  try {
    const [telemetria, inscricoes, conquistas] = await Promise.all([
      strapiGet<{ meta?: { pagination?: { total?: number } } }>('/telemetrias', {
        'filters[userId][$eq]': id,
        'filters[tipo][$eq]': 'simulacao.completed',
        'pagination[pageSize]': '1',
      }),
      strapiGet<{ meta?: { pagination?: { total?: number } } }>('/inscricoes', {
        'filters[alunoId][$eq]': id,
        'filters[concluido][$eq]': 'false',
        'pagination[pageSize]': '1',
      }),
      strapiGet<{ meta?: { pagination?: { total?: number } } }>('/conquistas', {
        'filters[userId][$eq]': id,
        'filters[desbloqueada][$eq]': 'true',
        'pagination[pageSize]': '1',
      }),
    ]);
    return c.json({
      simulacoesConcluidas: telemetria?.meta?.pagination?.total ?? 0,
      cursosEmProgresso: inscricoes?.meta?.pagination?.total ?? 0,
      conquistasTotal: conquistas?.meta?.pagination?.total ?? 0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// GET /perfis/estudantes-vinculados — estudantes conectados à instituição
perfilRoutes.get('/estudantes-vinculados', checkRole(['instituicao', 'super_admin']), async (c) => {
  const { id: userId } = c.get('user');
  try {
    const vinculos = await strapiGet<VinculosResponse>('/vinculos', {
      'filters[receiverId][$eq]': userId,
      'filters[connectionType][$eq]': 'student-institution',
      'filters[estado][$eq]': 'connected',
      'pagination[pageSize]': '100',
    });
    const studentIds = (vinculos?.data ?? []).map((v) => v?.attributes?.senderId ?? v?.senderId).filter(Boolean) as string[];
    if (studentIds.length === 0) {
      return c.json({ data: [] });
    }
    const students = await Promise.all(
      studentIds.map((sid) =>
        strapiGet<unknown>(`/users/${sid}`, { populate: 'role,avatar' })
      )
    );
    return c.json({ data: students });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// GET /perfis/:id — perfil público
perfilRoutes.get('/:id', async (c) => {
  const userId = c.req.param('id');
  try {
    const data = await strapiGet<unknown>(`/users/${userId}`, {
      populate: 'role,avatar',
    });
    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

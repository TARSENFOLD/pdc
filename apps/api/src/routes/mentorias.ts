import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { strapiGet, strapiPost, strapiPut } from '../modules/strapi/strapi.client.js';

type Vars = { Variables: AuthVariables };

const solicitarSchema = z.object({
  mentorId: z.string().min(1),
  mensagem: z.string().min(10).max(500),
});

const recusarSchema = z.object({
  motivo: z.string().max(300).optional(),
});

export const mentoriaRoutes = new Hono<Vars>();

mentoriaRoutes.use('*', verifyJwt);

// GET /mentorias — filtrado por role
mentoriaRoutes.get('/', async (c) => {
  const { id, role } = c.get('user');
  const params: Record<string, string> = { populate: 'aluno,mentor', 'sort': 'createdAt:desc' };
  if (role === 'aluno') {
    params['filters[alunoId][$eq]'] = id;
  } else if (role === 'mentor') {
    params['filters[mentorId][$eq]'] = id;
  }
  // moderadores e admins vêem tudo
  try {
    return c.json(await strapiGet<unknown>('/mentorias', params));
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

// POST /mentorias — aluno solicita
mentoriaRoutes.post(
  '/',
  checkRole(['aluno']),
  zValidator('json', solicitarSchema),
  async (c) => {
    const { id: alunoId } = c.get('user');
    const { mentorId, mensagem } = c.req.valid('json');
    try {
      return c.json(
        await strapiPost<unknown>('/mentorias', {
          alunoId,
          mentorId,
          mensagem,
          estado: 'pendente',
        }),
        201
      );
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
    }
  }
);

// PUT /mentorias/:id/aceitar — mentor
mentoriaRoutes.put('/:id/aceitar', checkRole(['mentor']), async (c) => {
  const id = c.req.param('id');
  try {
    return c.json(await strapiPut<unknown>(`/mentorias/${id}`, { estado: 'aceite' }));
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

// PUT /mentorias/:id/recusar — mentor
mentoriaRoutes.put(
  '/:id/recusar',
  checkRole(['mentor']),
  zValidator('json', recusarSchema),
  async (c) => {
    const id = c.req.param('id');
    const { motivo } = c.req.valid('json');
    try {
      const payload: Record<string, string> = { estado: 'recusada' };
      if (motivo !== undefined) payload['motivo'] = motivo;
      return c.json(await strapiPut<unknown>(`/mentorias/${id}`, payload));
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
    }
  }
);

// PUT /mentorias/:id/concluir — aluno ou mentor
mentoriaRoutes.put('/:id/concluir', async (c) => {
  const id = c.req.param('id');
  try {
    return c.json(await strapiPut<unknown>(`/mentorias/${id}`, { estado: 'concluida' }));
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
  }
});

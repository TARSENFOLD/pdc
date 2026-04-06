import { Hono } from 'hono';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { strapiGet, strapiPut } from '../modules/strapi/strapi.client.js';

type Vars = { Variables: AuthVariables };
export const estudanteRoutes = new Hono<Vars>();

estudanteRoutes.use('*', verifyJwt, checkRole(['aluno', 'super_admin']));

// GET /estudante/progresso (Já existente, vou adicionar detalhes de certificados e progresso)
// POST /estudante/progresso/:inscricaoId/atualizar
estudanteRoutes.post('/progresso/:inscricaoId/atualizar', async (c) => {
  const inscricaoId = c.req.param('inscricaoId');
  const body = await c.req.json();
  // Integração com Strapi para atualizar %
  const data = await strapiPut<unknown>(`/inscricoes/${inscricaoId}`, body);
  return c.json(data);
});
// GET /estudante/certificados
estudanteRoutes.get('/certificados', async (c) => {
  const { id: alunoId } = c.get('user');
  const data = await strapiGet<unknown>('/certificados', {
    'filters[alunoId][$eq]': alunoId,
    populate: 'curso',
  });
  return c.json(data);
});

// GET /estudante/ranking
estudanteRoutes.get('/ranking', async (c) => {
  // Retorna Top 10 baseados em XP acumulado
  const data = await strapiGet<unknown>('/perfis', {
    sort: 'xp:desc',
    'pagination[limit]': '10',
  });
  return c.json(data);
});

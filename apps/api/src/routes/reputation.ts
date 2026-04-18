import { Hono } from 'hono';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import * as reputationService from '../modules/reputation/reputation.service.js';

type Vars = { Variables: AuthVariables };

export const reputationRoutes = new Hono<Vars>();

reputationRoutes.use('*', verifyJwt);

// GET /reputation/me — retorna score + breakdown do utilizador autenticado
reputationRoutes.get('/me', async (c) => {
  const user = c.get('user');
  try {
    const breakdown = await reputationService.getReputacaoBreakdown(user.id);
    return c.json(breakdown);
  } catch {
    return c.json({ error: 'Erro ao obter reputação' }, 500);
  }
});

// GET /reputation/:perfilId — retorna score de qualquer perfil
reputationRoutes.get('/:perfilId', async (c) => {
  const perfilId = c.req.param('perfilId');
  try {
    const score = await reputationService.getReputacao(perfilId);
    return c.json({ score });
  } catch {
    return c.json({ score: 0 });
  }
});

// GET /reputation/:perfilId/breakdown — retorna as 6 dimensões individuais
reputationRoutes.get('/:perfilId/breakdown', async (c) => {
  const perfilId = c.req.param('perfilId');
  try {
    const breakdown = await reputationService.getReputacaoBreakdown(perfilId);
    return c.json(breakdown);
  } catch {
    return c.json({ error: 'Erro ao obter breakdown' }, 500);
  }
});

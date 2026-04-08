import { Hono } from 'hono';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { recalcularGlobal, persistirReputacao } from '../modules/reputation/reputation.service.js';

type Vars = { Variables: AuthVariables };
export const reputationRoutes = new Hono<Vars>();

// All reputation admin routes require super_admin
reputationRoutes.use('*', verifyJwt, checkRole(['super_admin']));

// POST /admin/reputation/recalcular — recálculo global
reputationRoutes.post('/recalcular', async (c) => {
  const result = await recalcularGlobal();
  return c.json({ success: true, ...result });
});

// POST /admin/reputation/recalcular/:perfilId — recálculo individual
reputationRoutes.post('/recalcular/:perfilId', async (c) => {
  const perfilId = c.req.param('perfilId');
  const score = await persistirReputacao(perfilId);
  return c.json({ success: true, perfilId, score });
});

import { Hono } from 'hono';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import * as reputationService from '../modules/reputation/reputation.service.js';
import { ReputacaoBreakdownSchema } from '@pdc/shared';

type Vars = { Variables: AuthVariables };

export const reputationRoutes = new Hono<Vars>();

reputationRoutes.use('*', verifyJwt);

/**
 * GET /reputacao/me (Canónico) & /reputation/me (Alias)
 * Retorna score + breakdown detalhado do utilizador autenticado.
 * Gated por flag REPUTATION_VISIBLE (Retorna 404 se off).
 */
reputationRoutes.get('/me', async (c) => {
  const user = c.get('user');
  try {
    const breakdown = await reputationService.getReputacaoBreakdown(user.id);
    
    // SSOT Validation (Approach §4)
    const valid = ReputacaoBreakdownSchema.parse(breakdown);
    return c.json(valid);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && ('status' in err || 'message' in err)) {
      const e = err as { status?: number; message?: string };
      if (e.status === 404 || e.message === 'Reputação desativada') {
        return c.json({ error: 'Reputação ainda não disponível para este perfil.' }, 404);
      }
    }
    return c.json({ error: 'Falha ao processar motor de reputação soberano.' }, 500);
  }
});

/**
 * GET /reputacao/:perfilId
 * Retorna apenas o score numérico (Legacy path compat).
 */
reputationRoutes.get('/:perfilId', async (c) => {
  const perfilId = c.req.param('perfilId');
  try {
    const score = await reputationService.getReputacao(perfilId);
    return c.json({ score });
  } catch {
    return c.json({ score: 0 });
  }
});

/**
 * GET /reputacao/:perfilId/breakdown
 * Retorna o breakdown de qualquer perfil (Admin/Mentor path).
 */
reputationRoutes.get('/:perfilId/breakdown', async (c) => {
  const perfilId = c.req.param('perfilId');
  try {
    const breakdown = await reputationService.getReputacaoBreakdown(perfilId);
    return c.json(breakdown);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'status' in err) {
      const e = err as { status: number };
      if (e.status === 404) {
        return c.json({ error: 'Reputação desativada' }, 404);
      }
    }
    return c.json({ error: 'Erro ao obter breakdown' }, 500);
  }
});

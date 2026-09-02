import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import { featureFlagService } from '../modules/feature-flags/feature-flags.service.js';

type Vars = { Variables: AuthVariables };
const InstitutionIdSchema = z.coerce.number().int().positive();

export const featureFlagsRoutes = new Hono<Vars>();

featureFlagsRoutes.use('*', verifyJwt);

// GET /feature-flags
featureFlagsRoutes.get('/', async (c) => {
  const flags = await featureFlagService.listAll();
  return c.json({ data: flags });
});

// PUT /feature-flags/defaults/:domain
featureFlagsRoutes.put(
  '/defaults/:domain',
  checkRole(['super_admin']),
  zValidator('json', z.object({ enabled: z.boolean() })),
  async (c) => {
    const domain = c.req.param('domain');
    if (!domain) return c.json({ error: 'Domínio obrigatório' }, 400);
    const { enabled } = c.req.valid('json');

    const flag = await featureFlagService.updateDefaultStrict(domain, enabled);
    if (!flag) {
      return c.json({ error: 'Flag não encontrada' }, 404);
    }

    return c.json(flag);
  }
);

// PUT /feature-flags/institutions/:instituicaoId/:domain
featureFlagsRoutes.put(
  '/institutions/:instituicaoId/:domain',
  checkRole(['super_admin']),
  zValidator('json', z.object({ enabled: z.boolean() })),
  async (c) => {
    const domain = c.req.param('domain');
    const instituicaoIdParam = c.req.param('instituicaoId');
    
    if (!domain || !instituicaoIdParam) {
      return c.json({ error: 'Parâmetros inválidos' }, 400);
    }

    const parsedInstituicaoId = InstitutionIdSchema.safeParse(instituicaoIdParam);
    if (!parsedInstituicaoId.success) {
      return c.json({ error: 'ID da instituição inválido' }, 400);
    }
    const instituicaoId = parsedInstituicaoId.data;
    const { enabled } = c.req.valid('json');

    const flag = await featureFlagService.setInstitutionOverride(domain, instituicaoId, enabled);
    if (!flag) {
      return c.json({ error: 'Flag não encontrada' }, 404);
    }

    return c.json(flag);
  }
);

// DELETE /feature-flags/institutions/:instituicaoId/:domain
featureFlagsRoutes.delete(
  '/institutions/:instituicaoId/:domain',
  checkRole(['super_admin']),
  async (c) => {
    const domain = c.req.param('domain');
    const instituicaoIdParam = c.req.param('instituicaoId');

    if (!domain || !instituicaoIdParam) {
      return c.json({ error: 'Parâmetros inválidos' }, 400);
    }

    const parsedInstituicaoId = InstitutionIdSchema.safeParse(instituicaoIdParam);
    if (!parsedInstituicaoId.success) {
      return c.json({ error: 'ID da instituição inválido' }, 400);
    }
    const instituicaoId = parsedInstituicaoId.data;

    const flag = await featureFlagService.removeInstitutionOverride(domain, instituicaoId);
    if (!flag) {
      return c.json({ error: 'Flag não encontrada' }, 404);
    }

    return c.json(flag);
  }
);

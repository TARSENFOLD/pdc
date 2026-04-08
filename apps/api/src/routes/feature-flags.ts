import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import * as flagsService from '../modules/feature-flags/feature-flags.service.js';

type Vars = { Variables: AuthVariables };
export const featureFlagRoutes = new Hono<Vars>();
featureFlagRoutes.use('*', verifyJwt);

const effectiveQuerySchema = z.object({
  perfilTipo: z.string().min(1),
  instituicaoId: z.coerce.number().int().positive().optional(),
});

const upsertBodySchema = z.object({
  enabled: z.boolean(),
  description: z.string().optional(),
});

const overrideBodySchema = z.object({
  enabled: z.boolean(),
});

// GET /feature-flags/effective?perfilTipo=aluno&instituicaoId=5
featureFlagRoutes.get(
  '/effective',
  zValidator('query', effectiveQuerySchema),
  async (c) => {
    const { perfilTipo, instituicaoId } = c.req.valid('query');
    try {
      const flags = await flagsService.getEffectiveFlags(perfilTipo, instituicaoId);
      return c.json(flags);
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
    }
  },
);

// GET /feature-flags — admin list all flags
featureFlagRoutes.get(
  '/',
  checkRole(['super_admin']),
  async (c) => {
    try {
      const flags = await flagsService.listAll();
      return c.json({ data: flags });
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
    }
  },
);

// PUT /feature-flags/defaults/:domain — create/update flag default (admin only)
featureFlagRoutes.put(
  '/defaults/:domain',
  checkRole(['super_admin']),
  zValidator('json', upsertBodySchema),
  async (c) => {
    const domain = c.req.param('domain');
    const { enabled, description } = c.req.valid('json');
    try {
      const flag = await flagsService.upsertDefault(domain, enabled, description);
      return c.json(flag);
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
    }
  },
);

// PUT /feature-flags/institutions/:id/:domain — set override (admin only)
featureFlagRoutes.put(
  '/institutions/:id/:domain',
  checkRole(['super_admin']),
  zValidator('json', overrideBodySchema),
  async (c) => {
    const instituicaoId = Number(c.req.param('id'));
    const domain = c.req.param('domain');
    const { enabled } = c.req.valid('json');
    try {
      const flag = await flagsService.setInstitutionOverride(domain, instituicaoId, enabled);
      return c.json(flag);
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
    }
  },
);

// DELETE /feature-flags/institutions/:id/:domain — remove override (admin only)
featureFlagRoutes.delete(
  '/institutions/:id/:domain',
  checkRole(['super_admin']),
  async (c) => {
    const instituicaoId = Number(c.req.param('id'));
    const domain = c.req.param('domain');
    try {
      const flag = await flagsService.removeInstitutionOverride(domain, instituicaoId);
      return c.json(flag);
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, 502);
    }
  },
);

import { Hono } from 'hono';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { checkRole } from '../modules/auth/rbac.middleware.js';
import * as featureFlagService from '../modules/feature-flags/feature-flags.service.js';
import { strapiGet, strapiPutRaw } from '../modules/strapi/strapi.client.js';

type Vars = { Variables: AuthVariables };
export const featureFlagRoutes = new Hono<Vars>();

// GET /effective — Acessível por qualquer user autenticado
featureFlagRoutes.get('/effective', verifyJwt, async (c) => {
  const user = c.get('user');
  const instituicaoId = user.role === 'instituicao' ? (user as any).instituicaoId : undefined;
  const flags = await featureFlagService.getEffectiveFlags(instituicaoId);
  return c.json(flags);
});

// Admin Routes (super_admin only)
featureFlagRoutes.use('*', verifyJwt, checkRole(['super_admin']));

// GET / — Lista todas as flags (admin)
featureFlagRoutes.get('/', async (c) => {
  const { data } = await strapiGet<{ data: any[] }>('/feature-flags');
  return c.json(data);
});

featureFlagRoutes.put('/defaults/:domain', async (c) => {
  const domain = c.req.param('domain');
  const body = await c.req.json();
  const { data: existing } = await strapiGet<{ data: any[] }>(`/feature-flags?filters[domain][$eq]=${domain}`);
  
  if (existing.length === 0) return c.json({ error: 'Flag não encontrada' }, 404);
  
  await strapiPutRaw(`/feature-flags/${existing[0].documentId ?? existing[0].id}`, { data: { enabled: body.enabled } });
  return c.json({ success: true });
});

featureFlagRoutes.put('/institutions/:id/:domain', async (c) => {
  const domain = c.req.param('domain');
  const instituicaoId = parseInt(c.req.param('id'));
  const body = await c.req.json();
  
  const { data: existing } = await strapiGet<{ data: any[] }>(`/feature-flags?filters[domain][$eq]=${domain}`);
  if (existing.length === 0) return c.json({ error: 'Flag não encontrada' }, 404);
  
  const flag = existing[0];
  const overrides = flag.overrides || [];
  const idx = overrides.findIndex((o: any) => o.instituicaoId === instituicaoId);
  
  if (idx > -1) overrides[idx].enabled = body.enabled;
  else overrides.push({ instituicaoId, enabled: body.enabled });
  
  await strapiPutRaw(`/feature-flags/${flag.documentId ?? flag.id}`, { data: { overrides } });
  return c.json({ success: true });
});

featureFlagRoutes.delete('/institutions/:id/:domain', async (c) => {
  const domain = c.req.param('domain');
  const instituicaoId = parseInt(c.req.param('id'));
  
  const { data: existing } = await strapiGet<{ data: any[] }>(`/feature-flags?filters[domain][$eq]=${domain}`);
  if (existing.length === 0) return c.json({ error: 'Flag não encontrada' }, 404);
  
  const flag = existing[0];
  const overrides = (flag.overrides || []).filter((o: any) => o.instituicaoId !== instituicaoId);
  
  await strapiPutRaw(`/feature-flags/${flag.documentId ?? flag.id}`, { data: { overrides } });
  return c.json({ success: true });
});

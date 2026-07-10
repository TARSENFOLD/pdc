import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { LtiScoreSchema } from '@pdc/shared';
import { getPublicJwks } from '../modules/lti/lti.jwks.js';
import { ltiAgsService } from '../modules/lti/lti.ags.js';
import { ltiNrps } from '../modules/lti/lti.nrps.js';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';

type Vars = { Variables: AuthVariables };

export const ltiRoutes = new Hono<Vars>();

const agsScorePayloadSchema = z.object({
  lineitemUrl: z.string().url(),
  score: LtiScoreSchema,
});

const nrpsQuerySchema = z.object({
  nrpsUrl: z.string().url(),
});

function ltiLaunchNotImplemented() {
  return {
    error: 'LTI launch ainda não está implementado neste BFF.',
    code: 'LTI_LAUNCH_NOT_IMPLEMENTED',
    detail: 'Grade passback AGS existe via contexto LTI, mas OIDC login/launch requer implementação completa de nonce, validação JWT IMS e provisionamento seguro.',
  };
}

// GET /lti/jwks — chave pública usada por plataformas LTI já configuradas.
ltiRoutes.get('/jwks', async (c) => {
  try {
    return c.json(await getPublicJwks());
  } catch (err: unknown) {
    return c.json({
      error: err instanceof Error ? err.message : 'Configuração LTI inválida',
      code: 'LTI_JWKS_UNAVAILABLE',
    }, 503);
  }
});

// OIDC login/launch não deve ficar comentado nem simulado: expõe estado real.
ltiRoutes.all('/login', (c) => c.json(ltiLaunchNotImplemented(), 501));
ltiRoutes.post('/launch', (c) => c.json(ltiLaunchNotImplemented(), 501));

// POST /lti/ags/scores — utilitário protegido para passback explícito com token LMS já obtido.
ltiRoutes.post('/ags/scores', verifyJwt, zValidator('json', agsScorePayloadSchema), async (c) => {
  const accessToken = c.req.header('x-lms-access-token');
  if (!accessToken) {
    return c.json({ error: 'accessToken obrigatório', code: 'LTI_AGS_MISSING_TOKEN' }, 400);
  }
  const { lineitemUrl, score } = c.req.valid('json');
  try {
    return c.json(await ltiAgsService.sendScore(lineitemUrl, score, accessToken));
  } catch (err: unknown) {
    return c.json({
      error: err instanceof Error ? err.message : 'Falha ao comunicar com LMS',
      code: 'LTI_AGS_UNAVAILABLE',
    }, 502);
  }
});

// GET /lti/nrps/memberships — utilitário protegido para consulta NRPS com token LMS já obtido.
ltiRoutes.get('/nrps/memberships', verifyJwt, zValidator('query', nrpsQuerySchema), async (c) => {
  const { nrpsUrl } = c.req.valid('query');
  const accessToken = c.req.header('x-lms-access-token');
  if (!accessToken) {
    return c.json({ error: 'accessToken obrigatório', code: 'LTI_NRPS_MISSING_TOKEN' }, 400);
  }
  try {
    return c.json({ data: await ltiNrps.getMemberships(nrpsUrl, accessToken) });
  } catch (err: unknown) {
    return c.json({
      error: err instanceof Error ? err.message : 'Falha ao comunicar com LMS',
      code: 'LTI_NRPS_UNAVAILABLE',
    }, 502);
  }
});
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { setCookie } from 'hono/cookie';
import { strapiGet } from '../modules/strapi/strapi.client.js';
import { ltiService } from '../modules/lti/lti.service.js';
import { getPublicJwks } from '../modules/lti/lti.jwks.js';
import { authService } from '../modules/auth/auth.service.js';
import { env } from '../lib/env.js';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { ltiAgs } from '../modules/lti/lti.ags.js';
import { ltiNrps } from '../modules/lti/lti.nrps.js';
import { LtiScoreSchema, type LtiPlataforma } from '@pdc/shared';

const loginSchema = z.object({
  iss: z.string().url(),
  login_hint: z.string(),
  target_link_uri: z.string().url(),
  lti_message_hint: z.string().optional(),
});

const launchSchema = z.object({
  id_token: z.string(),
  state: z.string(),
});

export const ltiRoutes = new Hono<{ Variables: AuthVariables }>();

// GET /lti/jwks
ltiRoutes.get('/jwks', async (c) => {
  return c.json(await getPublicJwks());
});

// POST /lti/login
ltiRoutes.post('/login', zValidator('form', loginSchema), async (c) => {
  const { iss, login_hint, lti_message_hint } = c.req.valid('form');

  // Buscar plataforma no Strapi
  const res = await strapiGet<{ data: Array<{ id: string; attributes: LtiPlataforma }> }>('/lti-plataformas', {
    'filters[issuer][$eq]': iss,
    'filters[ativo][$eq]': 'true',
  });

  if (res.data.length === 0) {
    return c.json({ error: 'Plataforma LTI não encontrada ou inativa' }, 401);
  }

  const firstPlatform = res.data[0];
  if (!firstPlatform) return c.json({ error: 'Plataforma LTI não encontrada' }, 401);
  const plataforma = firstPlatform.attributes;
  const state = Math.random().toString(36).substring(2);
  const nonce = await ltiService.generateNonce(state);

  // A URL de redirecionamento deve ser o endpoint de launch do BFF
  const bffUrl = env.API_URL;
  const redirectUri = `${bffUrl}/lti/launch`;

  const authUrl = new URL(plataforma.authLoginUrl);
  authUrl.searchParams.set('client_id', plataforma.clientId);
  authUrl.searchParams.set('response_type', 'id_token');
  authUrl.searchParams.set('scope', 'openid');
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('login_hint', login_hint);
  authUrl.searchParams.set('nonce', nonce);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('response_mode', 'form_post');
  if (lti_message_hint) authUrl.searchParams.set('lti_message_hint', lti_message_hint);

  return c.redirect(authUrl.toString());
});

// POST /lti/launch
ltiRoutes.post('/launch', zValidator('form', launchSchema), async (c) => {
  const { id_token, state } = c.req.valid('form');

  // 1. Validar Nonce/State decodificando o payload primeiro
  const parts = id_token.split('.');
  if (parts.length !== 3) return c.json({ error: 'Token inválido' }, 400);
  const encoded = parts[1];
  if (!encoded) return c.json({ error: 'Token inválido' }, 400);
  const payload = JSON.parse(Buffer.from(encoded, 'base64').toString()) as { nonce: string; iss: string };
  
  const isValidNonce = await ltiService.validateNonce(payload.nonce, state);
  if (!isValidNonce) return c.json({ error: 'Nonce inválido ou expirado' }, 403);

  // 2. Buscar plataforma
  const res = await strapiGet<{ data: Array<{ id: string; attributes: LtiPlataforma }> }>('/lti-plataformas', {
    'filters[issuer][$eq]': payload.iss,
  });
  if (!res.data[0]) return c.json({ error: 'Plataforma não encontrada' }, 401);
  const plataforma: LtiPlataforma = { ...res.data[0].attributes, id: res.data[0].id };

  // 3. Validar Assinatura do JWT
  const claims = await ltiService.validateLaunchJwt(id_token, plataforma);

  // 4. Upsert utilizador e criar sessão
  const user = await ltiService.upsertLtiUser(claims);
  const { accessToken, refreshToken } = await authService.generateTokens(user);
  await authService.saveRefreshToken(user.id, refreshToken);

  setCookie(c, 'access_token', accessToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'Lax',
    path: '/',
    maxAge: 15 * 60,
  });

  setCookie(c, 'refresh_token', refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'Lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });

  return c.redirect(`${env.FRONTEND_URL}/app`);
});

// POST /lti/ags/scores
ltiRoutes.post('/ags/scores', verifyJwt, zValidator('json', z.object({
  lineitemUrl: z.string().url(),
  score: LtiScoreSchema,
  accessToken: z.string(),
})), async (c) => {
  const { lineitemUrl, score, accessToken } = c.req.valid('json');
  return c.json(await ltiAgs.sendScore(lineitemUrl, score, accessToken));
});

// GET /lti/nrps/memberships
ltiRoutes.get('/nrps/memberships', verifyJwt, async (c) => {
  const nrpsUrl = c.req.query('nrpsUrl');
  const accessToken = c.req.query('accessToken');
  if (!nrpsUrl || !accessToken) return c.json({ error: 'Parâmetros em falta' }, 400);
  return c.json(await ltiNrps.getMemberships(nrpsUrl, accessToken));
});

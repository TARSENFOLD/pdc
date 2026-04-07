import { Hono } from 'hono';
import { randomUUID } from 'node:crypto';
import pino from 'pino';
import { redis } from '../lib/redis.js';
import { authService } from '../modules/auth/auth.service.js';
import { setAuthCookies } from '../modules/auth/auth.helper.js';
import { type AuthVariables } from '../modules/auth/auth.middleware.js';

const log = pino({ name: 'oauth-routes' });
export const oauthRoutes = new Hono<{ Variables: AuthVariables }>();

oauthRoutes.get('/google', async (c) => {
  const state = randomUUID();
  if (redis) await redis.set(`oauth_state:${state}`, 'true', { ex: 600 });
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/auth/google/callback',
    response_type: 'code',
    scope: 'openid email profile',
    state,
  });
  return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

oauthRoutes.get('/google/callback', async (c) => {
  const { code, state } = c.req.query();
  if (redis) {
    const exists = await redis.get(`oauth_state:${state ?? ''}`);
    if (!exists) return c.json({ error: 'Invalid state' }, 400);
    await redis.del(`oauth_state:${state ?? ''}`);
  }
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code || '',
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/auth/google/callback',
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenRes.ok) return c.json({ error: 'Token error' }, 400);
    const tokens = await tokenRes.json() as { access_token: string };
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const googleUser = await userRes.json() as { email: string; name: string };
    const user = await authService.findOrCreateUser(googleUser.email, googleUser.name);
    const { accessToken, refreshToken } = await authService.generateTokens(user);
    await authService.saveRefreshToken(user.id, refreshToken);
    setAuthCookies(c, accessToken, refreshToken);
    return c.redirect(`${process.env.OAUTH_REDIRECT_BASE_URL || 'http://localhost:3000'}/app/dashboard`);
  } catch (err) {
    log.error({ err }, 'Google callback error');
    return c.json({ error: 'Internal server error' }, 500);
  }
});

oauthRoutes.get('/linkedin', async (c) => {
  const state = randomUUID();
  if (redis) await redis.set(`oauth_state:${state}`, 'true', { ex: 600 });
  const params = new URLSearchParams({
    client_id: process.env.LINKEDIN_CLIENT_ID || '',
    redirect_uri: process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3001/auth/linkedin/callback',
    response_type: 'code',
    scope: 'openid email profile',
    state,
  });
  return c.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`);
});

oauthRoutes.get('/linkedin/callback', async (c) => {
  const { code, state } = c.req.query();
  if (redis) {
    const exists = await redis.get(`oauth_state:${state ?? ''}`);
    if (!exists) return c.json({ error: 'Invalid state' }, 400);
    await redis.del(`oauth_state:${state ?? ''}`);
  }
  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code || '',
      client_id: process.env.LINKEDIN_CLIENT_ID || '',
      client_secret: process.env.LINKEDIN_CLIENT_SECRET || '',
      redirect_uri: process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3001/auth/linkedin/callback',
    }),
  });
  const tokens = await tokenRes.json() as { access_token: string };
  const userRes = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const liUser = await userRes.json() as { email: string; name: string };
  const user = await authService.findOrCreateUser(liUser.email, liUser.name);
  const { accessToken, refreshToken } = await authService.generateTokens(user);
  await authService.saveRefreshToken(user.id, refreshToken);
  setAuthCookies(c, accessToken, refreshToken);
  return c.redirect(`${process.env.OAUTH_REDIRECT_BASE_URL || 'http://localhost:3000'}/app/dashboard`);
});

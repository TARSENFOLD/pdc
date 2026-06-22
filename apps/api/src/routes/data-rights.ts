import { Hono } from 'hono';
import { deleteCookie } from 'hono/cookie';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { dataRightsService } from '../modules/data-rights/data-rights.service.js';

export const dataRightsRoutes = new Hono<{ Variables: AuthVariables }>();

const deleteAccountSchema = z.object({
  confirmacao: z.literal('APAGAR'),
});

function requestIp(headers: Headers): string {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

dataRightsRoutes.use('*', verifyJwt);

dataRightsRoutes.get('/export', async (c) => {
  const user = c.get('user');
  const userAgent = c.req.header('user-agent');
  const exported = await dataRightsService.exportUserData({
    userId: user.id,
    role: user.role,
    ip: requestIp(c.req.raw.headers),
    ...(userAgent ? { userAgent } : {}),
  });

  c.header('Content-Disposition', 'attachment; filename="pdc-dados.json"');
  return c.json(exported);
});

dataRightsRoutes.post('/delete-account', zValidator('json', deleteAccountSchema), async (c) => {
  const user = c.get('user');
  const userAgent = c.req.header('user-agent');
  const result = await dataRightsService.softDeleteAndAnonymize({
    userId: user.id,
    role: user.role,
    ip: requestIp(c.req.raw.headers),
    ...(userAgent ? { userAgent } : {}),
  });

  deleteCookie(c, 'access_token');
  deleteCookie(c, 'refresh_token');
  return c.json(result);
});

dataRightsRoutes.post('/delete-vocacional', async (c) => {
  const user = c.get('user');
  const userAgent = c.req.header('user-agent');
  const result = await dataRightsService.deleteVocationalProfile({
    userId: user.id,
    role: user.role,
    ip: requestIp(c.req.raw.headers),
    ...(userAgent ? { userAgent } : {}),
  });
  return c.json(result);
});

dataRightsRoutes.post('/revoke-accesses', async (c) => {
  const user = c.get('user');
  const userAgent = c.req.header('user-agent');
  const result = await dataRightsService.revokeAccesses({
    userId: user.id,
    role: user.role,
    ip: requestIp(c.req.raw.headers),
    ...(userAgent ? { userAgent } : {}),
  });
  return c.json(result);
});

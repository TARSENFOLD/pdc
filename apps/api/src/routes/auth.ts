import { Hono, type Context } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { setCookie, deleteCookie, getCookie } from 'hono/cookie';
import { authService } from '../modules/auth/auth.service.js';
import { otpService } from '../modules/auth/otp.service.js';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { rateLimit, rateLimitRegisto } from '../middleware/rateLimit.js';
import { redis } from '../lib/redis.js';
import { randomUUID } from 'node:crypto';
import {
  RegistoEstudantePayloadSchema,
  RegistoMentorPayloadSchema,
  RegistoInstituicaoPayloadSchema,
  type User,
} from '@pdc/shared';

export const authRoutes = new Hono<{ Variables: AuthVariables }>();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  nome: z.string().min(2).max(100),
});

const isProd = process.env.NODE_ENV === 'production';

function setAuthCookies(
  c: Context<{ Variables: AuthVariables }>,
  accessToken: string,
  refreshToken: string
) {
  setCookie(c, 'access_token', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'Strict',
    maxAge: 15 * 60,
    path: '/',
  });
  setCookie(c, 'refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'Strict',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });
}

async function initiate2faChallenge(c: Context, user: User) {
  const challengeId = randomUUID();
  if (redis) {
    await redis.set(`auth_challenge:${challengeId}`, user.id, { ex: 600 });
  }

  setCookie(c, 'auth_challenge', challengeId, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'Strict',
    maxAge: 600,
    path: '/',
  });

  // Auto-send OTP via email
  try {
    const otp = otpService.generateOtp();
    await otpService.storeOtp(user.id, otp, 'email');
    await otpService.sendOtpEmail(user.email, otp);
  } catch (err) {
    console.error('Failed to auto-send OTP:', err);
  }

  return c.json({ requiresOtp: true, canal: 'email' });
}

authRoutes.use('/login', rateLimit);
authRoutes.use('/register', rateLimit);
authRoutes.use('/refresh', rateLimit);

authRoutes.post('/register', zValidator('json', registerSchema), async (c) => {
  const { email, password, nome } = c.req.valid('json');
  try {
    const user = await authService.register(email, password, nome);
    return await initiate2faChallenge(c, user);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return c.json({ error: message }, 400);
  }
});

authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json');
  try {
    const user = await authService.login(email, password);
    return await initiate2faChallenge(c, user);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return c.json({ error: message }, 401);
  }
});

authRoutes.post('/logout', verifyJwt, async (c) => {
  const user = c.get('user');
  const refreshToken = getCookie(c, 'refresh_token');
  if (refreshToken) {
    await authService.revokeRefreshToken(user.id, refreshToken);
  }
  deleteCookie(c, 'access_token');
  deleteCookie(c, 'refresh_token');
  return c.json({ success: true });
});

authRoutes.post('/refresh', async (c) => {
  const oldRefreshToken = getCookie(c, 'refresh_token');
  if (!oldRefreshToken) return c.json({ error: 'No refresh token' }, 401);

  const verified = await authService.verifyRefreshToken(oldRefreshToken);
  if (!verified) return c.json({ error: 'Invalid refresh token' }, 401);

  try {
    const user = await authService.getUserById(verified.userId);
    const { accessToken, refreshToken } = await authService.generateTokens(user);
    await authService.revokeRefreshToken(user.id, oldRefreshToken);
    await authService.saveRefreshToken(user.id, refreshToken);
    setAuthCookies(c, accessToken, refreshToken);
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Session expired' }, 401);
  }
});

authRoutes.get('/me', verifyJwt, async (c) => {
  const authUser = c.get('user');
  try {
    const user = await authService.getUserById(authUser.id);
    return c.json(user);
  } catch {
    return c.json({ error: 'User not found' }, 404);
  }
});

// ─── Google OAuth ─────────────────────────────────────────────────────────────

authRoutes.get('/google', async (c) => {
  const state = randomUUID();
  if (redis) {
    await redis.set(`oauth_state:${state}`, 'true', { ex: 600 });
  }
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/auth/google/callback',
    response_type: 'code',
    scope: 'openid email profile',
    state,
  });
  return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

authRoutes.get('/google/callback', async (c) => {
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

    if (!tokenRes.ok) {
      console.error('Google OAuth token error:', await tokenRes.text().catch(() => ''));
      return c.json({ error: 'Falha ao autenticar com o Google. Código inválido ou expirado.' }, 400);
    }

    const tokens = await tokenRes.json() as { access_token?: string };
    if (!tokens.access_token) {
      return c.json({ error: 'Token de acesso não retornado pelo Google.' }, 400);
    }

    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userRes.ok) {
      console.error('Google OAuth userinfo error:', await userRes.text().catch(() => ''));
      return c.json({ error: 'Falha ao obter informações do utilizador.' }, 400);
    }

    const googleUser = await userRes.json() as { email?: string; name?: string };
    if (!googleUser.email || !googleUser.name) {
      return c.json({ error: 'Informações do utilizador incompletas recebidas do Google.' }, 400);
    }

    const user = await authService.findOrCreateUser(googleUser.email, googleUser.name);
    const { accessToken, refreshToken } = await authService.generateTokens(user);
    await authService.saveRefreshToken(user.id, refreshToken);
    setAuthCookies(c, accessToken, refreshToken);

    const redirectBase = process.env.OAUTH_REDIRECT_BASE_URL;
    if (!redirectBase) {
       console.error('Missing OAUTH_REDIRECT_BASE_URL env var');
    }
    return c.redirect(`${redirectBase || 'http://localhost:3000'}/app/dashboard`);
  } catch (err) {
    console.error('Unexpected error during Google callback:', err);
    return c.json({ error: 'Erro inesperado durante a autenticação.' }, 500);
  }
});

// ─── LinkedIn OAuth ───────────────────────────────────────────────────────────

authRoutes.get('/linkedin', async (c) => {
  const state = randomUUID();
  if (redis) {
    await redis.set(`oauth_state:${state}`, 'true', { ex: 600 });
  }
  const params = new URLSearchParams({
    client_id: process.env.LINKEDIN_CLIENT_ID || '',
    redirect_uri: process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3001/auth/linkedin/callback',
    response_type: 'code',
    scope: 'openid email profile',
    state,
  });
  return c.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`);
});

authRoutes.get('/linkedin/callback', async (c) => {
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

// ─── Registo por Tipo ─────────────────────────────────────────────────────────

authRoutes.use('/register/estudante', rateLimitRegisto);
authRoutes.use('/register/mentor', rateLimitRegisto);
authRoutes.use('/register/instituicao', rateLimitRegisto);

authRoutes.post(
  '/register/estudante',
  zValidator('json', RegistoEstudantePayloadSchema),
  async (c) => {
    const { email, password, nome, areaInteresse, nivelEnsino } = c.req.valid('json');
    try {
      const user = await authService.registerWithRole(email, password, nome, 'aluno', {
        areaInteresse,
        nivelEnsino,
      });
      return await initiate2faChallenge(c, user);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      return c.json({ error: message }, 400);
    }
  },
);

authRoutes.post(
  '/register/mentor',
  zValidator('json', RegistoMentorPayloadSchema),
  async (c) => {
    const { email, password, nome, areaEspecialidade, documentos } = c.req.valid('json');
    try {
      const user = await authService.registerWithRole(email, password, nome, 'mentor', {
        areaEspecialidade,
        documentos: documentos ?? [],
        aprovado: false,
      });
      return await initiate2faChallenge(c, user);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      return c.json({ error: message }, 400);
    }  },
);

authRoutes.post(
  '/register/instituicao',
  zValidator('json', RegistoInstituicaoPayloadSchema),
  async (c) => {
    const { nomeInstituicao, email, password, regiao, tipo, documentos } = c.req.valid('json');
    try {
      const user = await authService.registerWithRole(email, password, nomeInstituicao, 'instituicao', {
        regiao,
        tipo,
        documentos: documentos ?? [],
        aprovado: false,
      });
      return await initiate2faChallenge(c, user);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      return c.json({ error: message }, 400);
    }
  },
);

// ─── OTP 2FA (challenge-based, no JWT required) ──────────────────────────────

const otpSendSchema = z.object({
  canal: z.enum(['email', 'sms']),
  phone: z.string().optional(),
});

const otpVerifySchema = z.object({
  otp: z.string().length(6),
  canal: z.enum(['email', 'sms']),
});

async function getChallengeUserId(c: Context<{ Variables: AuthVariables }>): Promise<string | null> {
  const challengeId = getCookie(c, 'auth_challenge');
  if (!challengeId || !redis) return null;
  return redis.get<string>(`auth_challenge:${challengeId}`);
}

authRoutes.post('/otp/send', zValidator('json', otpSendSchema), async (c) => {
  const userId = await getChallengeUserId(c);
  if (!userId) {
    return c.json({ error: 'Sessão de desafio inválida ou expirada. Faça login novamente.' }, 401);
  }
  const { canal, phone } = c.req.valid('json');

  // Rate limit: 3 requests per 10min
  if (redis) {
    const rateKey = `otp_rate:${userId}`;
    const count = await redis.incr(rateKey);
    if (count === 1) {
      await redis.expire(rateKey, 600);
    }
    if (count > 3) {
      return c.json({ error: 'Muitos pedidos de OTP. Tente novamente em 10 minutos.' }, 429);
    }
  }

  try {
    const otp = otpService.generateOtp();
    await otpService.storeOtp(userId, otp, canal);

    if (canal === 'email') {
      const fullUser = await authService.getUserById(userId);
      await otpService.sendOtpEmail(fullUser.email, otp);
    } else {
      if (!phone || !phone.startsWith('+244')) {
        return c.json({ error: 'Número de telefone angolano (+244) obrigatório para SMS' }, 400);
      }
      await otpService.sendOtpSms(phone, otp);
    }

    return c.json({ success: true, canal });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao processar OTP';
    console.error('Error sending OTP:', err);
    return c.json({ error: message }, 500);
  }
});

authRoutes.post('/otp/sms', verifyJwt, zValidator('json', z.object({ phone: z.string() })), async (c) => {
  const user = c.get('user');
  const { phone } = c.req.valid('json');

  if (redis) {
    const rateKey = `otp_rate:${user.id}`;
    const count = await redis.incr(rateKey);
    if (count === 1) await redis.expire(rateKey, 600);
    if (count > 3) return c.json({ error: 'Muitos pedidos de OTP. Tente novamente em 10 minutos.' }, 429);
  }

  try {
    if (!phone.startsWith('+244')) {
      return c.json({ error: 'Número de telefone angolano (+244) obrigatório para SMS' }, 400);
    }
    const otp = otpService.generateOtp();
    await otpService.storeOtp(user.id, otp, 'sms');
    await otpService.sendOtpSms(phone, otp);
    return c.json({ success: true, canal: 'sms' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao processar OTP SMS';
    return c.json({ error: message }, 500);
  }
});

authRoutes.post('/otp/verify', zValidator('json', otpVerifySchema), async (c) => {
  const challengeId = getCookie(c, 'auth_challenge');
  if (!challengeId || !redis) {
    return c.json({ error: 'Sessão de desafio inválida ou expirada.' }, 401);
  }

  const userId = await redis.get<string>(`auth_challenge:${challengeId}`);
  if (!userId) {
    return c.json({ error: 'Sessão de desafio expirada. Faça login novamente.' }, 401);
  }

  const { otp, canal } = c.req.valid('json');

  try {
    const isValid = await otpService.verifyOtp(userId, otp, canal);
    if (!isValid) {
      return c.json({ error: 'Código inválido ou expirado' }, 400);
    }

    // OTP valid → create final JWT session
    const user = await authService.getUserById(userId);
    const { accessToken, refreshToken } = await authService.generateTokens(user);
    await authService.saveRefreshToken(user.id, refreshToken);
    setAuthCookies(c, accessToken, refreshToken);

    // Cleanup challenge
    deleteCookie(c, 'auth_challenge');
    await redis.del(`auth_challenge:${challengeId}`);

    return c.json(user);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao verificar OTP';
    return c.json({ error: message }, 500);
  }
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  redisGet: vi.fn(),
  setSentryUser: vi.fn(),
}));

vi.mock('../../lib/env.js', () => ({
  env: {
    JWT_SECRET: 'super-secret-at-least-32-chars-long',
  },
}));
vi.mock('../../lib/redis.js', () => ({ redis: { get: mocks.redisGet } }));
vi.mock('../../middleware/sentry.js', () => ({ setSentryUser: mocks.setSentryUser }));

import { Hono } from 'hono';
import { SignJWT } from 'jose';
import { z } from 'zod';
import { verifyJwt, optionalJwt, type AuthVariables, type OptionalAuthVariables } from './auth.middleware.js';

const secret = new TextEncoder().encode('super-secret-at-least-32-chars-long');

async function signedToken(
  payload: Record<string, unknown>,
  tokenType: 'access' | 'refresh' = 'access',
): Promise<string> {
  const subject = typeof payload['sub'] === 'string' ? payload['sub'] : 'user-1';
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: tokenType })
    .setSubject(subject)
    .sign(secret);
}

const AuthUserResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    role: z.string(),
    perfilId: z.string().optional(),
    instituicaoId: z.number().optional(),
    isMinor: z.boolean().optional(),
    estadoMenoridade: z.string().optional(),
  }),
});

const OptionalUserResponseSchema = z.object({
  user: z.null(),
});

describe('auth middleware JWT payload validation', () => {
  beforeEach(() => {
    mocks.redisGet.mockReset();
    mocks.redisGet.mockResolvedValue(null);
    mocks.setSentryUser.mockReset();
  });

  it('rejects a refresh token presented as an access token', async () => {
    const app = new Hono<{ Variables: AuthVariables }>();
    app.get('/private', verifyJwt, (c) => c.json({ user: c.get('user') }));
    const token = await signedToken({ sub: 'user-1', role: 'estudante' }, 'refresh');

    const res = await app.request('/private', {
      headers: { cookie: `access_token=${token}` },
    });

    expect(res.status).toBe(401);
  });

  it('rejects authenticated requests when payload fields are malformed', async () => {
    const app = new Hono<{ Variables: AuthVariables }>();
    app.get('/private', verifyJwt, (c) => c.json({ user: c.get('user') }));
    const token = await signedToken({
      sub: 'user-1',
      role: 'mentor',
      instituicaoId: null,
    });

    const res = await app.request('/private', {
      headers: { cookie: `access_token=${token}` },
    });

    expect(res.status).toBe(401);
  });

  it('normalizes valid numeric institution ids without blind casts', async () => {
    const app = new Hono<{ Variables: AuthVariables }>();
    app.get('/private', verifyJwt, (c) => c.json({ user: c.get('user') }));
    const token = await signedToken({
      sub: 'user-1',
      role: 'instituicao',
      perfilId: 'perfil-1',
      instituicaoId: '42',
    });

    const res = await app.request('/private', {
      headers: { cookie: `access_token=${token}` },
    });
    const body = AuthUserResponseSchema.parse(await res.json());

    expect(res.status).toBe(200);
    expect(body.user).toEqual({
      id: 'user-1',
      role: 'instituicao',
      perfilId: 'perfil-1',
      instituicaoId: 42,
    });
    expect(mocks.setSentryUser).toHaveBeenCalledWith('user-1');
  });

  it('propaga claim isMinor como eixo separado do role', async () => {
    const app = new Hono<{ Variables: AuthVariables }>();
    app.get('/private', verifyJwt, (c) => c.json({ user: c.get('user') }));
    const token = await signedToken({
      sub: 'user-1',
      role: 'estudante',
      isMinor: true,
      estadoMenoridade: 'menor',
      consentimentoEstado: 'completo',
    });

    const res = await app.request('/private', {
      headers: { cookie: `access_token=${token}` },
    });
    const body = AuthUserResponseSchema.parse(await res.json());

    expect(res.status).toBe(200);
    expect(body.user.isMinor).toBe(true);
    expect(body.user.estadoMenoridade).toBe('menor');
    expect(body.user.role).toBe('estudante');
  });

  it('blocks protected routes when token declares pending legal compliance', async () => {
    const app = new Hono<{ Variables: AuthVariables }>();
    app.get('/private', verifyJwt, (c) => c.json({ user: c.get('user') }));
    const token = await signedToken({
      sub: 'user-1',
      role: 'estudante',
      consentimentoEstado: 'pendente',
      estadoMenoridade: 'pendente',
    });

    const res = await app.request('/private', {
      headers: { cookie: `access_token=${token}` },
    });

    expect(res.status).toBe(403);
  });

  it('allows auth routes while legal compliance is pending', async () => {
    const app = new Hono<{ Variables: AuthVariables }>();
    app.get('/auth/compliance/legal', verifyJwt, (c) => c.json({ user: c.get('user') }));
    const token = await signedToken({
      sub: 'user-1',
      role: 'estudante',
      consentimentoEstado: 'pendente',
      estadoMenoridade: 'pendente',
    });

    const res = await app.request('/auth/compliance/legal', {
      headers: { cookie: `access_token=${token}` },
    });

    expect(res.status).toBe(200);
  });

  it('does not mask downstream handler errors as Unauthorized', async () => {
    const app = new Hono<{ Variables: AuthVariables }>();
    app.onError((err, c) => c.json({ error: err.message }, 500));
    app.get('/private', verifyJwt, () => {
      throw new Error('Strapi indisponível');
    });
    const token = await signedToken({
      sub: 'user-1',
      role: 'mentor',
    });

    const res = await app.request('/private', {
      headers: { cookie: `access_token=${token}` },
    });

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: 'Strapi indisponível' });
  });

  it('rejeita access token emitido antes da época global corrente', async () => {
    mocks.redisGet.mockResolvedValueOnce('1').mockResolvedValueOnce(null);
    const app = new Hono<{ Variables: AuthVariables }>();
    app.get('/private', verifyJwt, (c) => c.json({ user: c.get('user') }));
    const token = await signedToken({ sub: 'user-1', role: 'estudante', ver: 0 });

    const res = await app.request('/private', {
      headers: { cookie: `access_token=${token}` },
    });

    expect(res.status).toBe(401);
  });

  it('reporta indisponibilidade sem converter falha Redis em token inválido', async () => {
    mocks.redisGet.mockRejectedValueOnce(new Error('Redis unavailable'));
    const app = new Hono<{ Variables: AuthVariables }>();
    app.get('/private', verifyJwt, (c) => c.json({ user: c.get('user') }));
    const token = await signedToken({ sub: 'user-1', role: 'estudante' });

    const res = await app.request('/private', {
      headers: { cookie: `access_token=${token}` },
    });

    expect(res.status).toBe(503);
  });

  it('keeps optional auth anonymous for malformed payloads', async () => {
    const app = new Hono<{ Variables: OptionalAuthVariables }>();
    app.get('/public', optionalJwt, (c) => c.json({ user: c.get('user') ?? null }));
    const token = await signedToken({
      sub: 'user-1',
      role: 'mentor',
      instituicaoId: Number.NaN,
    });

    const res = await app.request('/public', {
      headers: { cookie: `access_token=${token}` },
    });
    const body = OptionalUserResponseSchema.parse(await res.json());

    expect(res.status).toBe(200);
    expect(body.user).toBeNull();
    expect(mocks.setSentryUser).not.toHaveBeenCalled();
  });
});

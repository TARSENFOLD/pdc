import { describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/env.js', () => ({
  env: {
    JWT_SECRET: 'super-secret-at-least-32-chars-long',
  },
}));

import { Hono } from 'hono';
import { SignJWT } from 'jose';
import { verifyJwt, optionalJwt, type AuthVariables, type OptionalAuthVariables } from './auth.middleware.js';

const secret = new TextEncoder().encode('super-secret-at-least-32-chars-long');

async function signedToken(payload: Record<string, unknown>): Promise<string> {
  const subject = typeof payload['sub'] === 'string' ? payload['sub'] : 'user-1';
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(subject)
    .sign(secret);
}

describe('auth middleware JWT payload validation', () => {
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
    const body = await res.json() as { user: AuthVariables['user'] };

    expect(res.status).toBe(200);
    expect(body.user).toEqual({
      id: 'user-1',
      role: 'instituicao',
      perfilId: 'perfil-1',
      instituicaoId: 42,
    });
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
    const body = await res.json() as { user: OptionalAuthVariables['user'] | null };

    expect(res.status).toBe(200);
    expect(body.user).toBeNull();
  });
});

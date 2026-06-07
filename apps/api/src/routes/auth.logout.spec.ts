import { describe, expect, it, vi } from 'vitest';

const authServiceMock = vi.hoisted(() => ({
  verifyRefreshToken: vi.fn(),
  revokeRefreshToken: vi.fn(),
  login: vi.fn(),
}));

vi.mock('../lib/env.js', () => ({
  env: {
    JWT_SECRET: 'super-secret-at-least-32-chars-long',
    API_URL: 'http://localhost:3001',
    FRONTEND_URL: 'http://localhost:5173',
  },
}));

vi.mock('../modules/auth/auth.service.js', () => ({
  authService: {
    verifyRefreshToken: authServiceMock.verifyRefreshToken,
    revokeRefreshToken: authServiceMock.revokeRefreshToken,
    register: vi.fn(),
    login: authServiceMock.login,
    getUserById: vi.fn(),
  },
}));

import { authRoutes } from './auth.js';
import { StrapiHttpError } from '../modules/strapi/strapi.client.js';

describe('GET /auth/me', () => {
  it('returns null instead of 401 when there is no session cookie', async () => {
    const res = await authRoutes.request('/me');

    expect(res.status).toBe(200);
    expect(await res.json()).toBeNull();
  });

  it('clears only an invalid access token and preserves a renewable refresh token', async () => {
    const res = await authRoutes.request('/me', {
      headers: { cookie: 'access_token=invalid; refresh_token=renewable' },
    });

    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('access_token=');
    expect(setCookie).not.toContain('refresh_token=');
  });
});

describe('POST /auth/logout', () => {
  it('is idempotent and clears cookies even when access token is absent', async () => {
    const res = await authRoutes.request('/logout', { method: 'POST' });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(res.headers.get('set-cookie')).toContain('access_token=');
    expect(res.headers.get('set-cookie')).toContain('refresh_token=');
  });

  it('revokes a valid refresh token without requiring a valid access token', async () => {
    authServiceMock.verifyRefreshToken.mockResolvedValueOnce({ userId: 'user-1' });

    const res = await authRoutes.request('/logout', {
      method: 'POST',
      headers: { cookie: 'refresh_token=refresh-1' },
    });

    expect(res.status).toBe(200);
    expect(authServiceMock.verifyRefreshToken).toHaveBeenCalledWith('refresh-1');
    expect(authServiceMock.revokeRefreshToken).toHaveBeenCalledWith('user-1', 'refresh-1');
  });
});

describe('POST /auth/login', () => {
  it('maps Strapi auth/local 400 to invalid credentials without leaking provider details', async () => {
    authServiceMock.login.mockRejectedValueOnce(
      new StrapiHttpError('Strapi POST /auth/local falhou: 400', 400, '/auth/local'),
    );

    const res = await authRoutes.request('/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: ' Aluno@Traycer.Test ', password: 'password123' }),
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Credenciais inválidas' });
    expect(authServiceMock.login).toHaveBeenCalledWith('aluno@traycer.test', 'password123');
  });

  it('maps non-auth Strapi failures to service unavailable', async () => {
    authServiceMock.login.mockRejectedValueOnce(
      new StrapiHttpError('Strapi POST /auth/local falhou: 503', 503, '/auth/local'),
    );

    const res = await authRoutes.request('/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'aluno@traycer.test', password: 'password123' }),
    });

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'Serviço de autenticação indisponível' });
  });
});

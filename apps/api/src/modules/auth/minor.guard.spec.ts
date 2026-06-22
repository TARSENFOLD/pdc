import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import type { AuthVariables } from './auth.middleware.js';
import { denyContactToMinor, requireAdult } from './minor.guard.js';

function appWithUser(user: AuthVariables['user'], guard: ReturnType<typeof requireAdult>) {
  const app = new Hono<{ Variables: AuthVariables }>();
  app.use('*', async (c, next) => {
    c.set('user', user);
    await next();
  });
  app.get('/guarded', guard, (c) => c.json({ ok: true }));
  return app;
}

describe('minor guards', () => {
  it('bloqueia utilizador menor em requireAdult', async () => {
    const app = appWithUser({ id: 'u-1', role: 'estudante', isMinor: true }, requireAdult());
    const response = await app.request('/guarded');
    expect(response.status).toBe(403);
  });

  it('permite utilizador adulto em requireAdult', async () => {
    const app = appWithUser({ id: 'u-1', role: 'estudante', isMinor: false }, requireAdult());
    const response = await app.request('/guarded');
    expect(response.status).toBe(200);
  });

  it('bloqueia contacto direto quando estadoMenoridade é menor', async () => {
    const app = appWithUser({ id: 'u-1', role: 'estudante', estadoMenoridade: 'menor' }, denyContactToMinor());
    const response = await app.request('/guarded');
    expect(response.status).toBe(403);
  });
});

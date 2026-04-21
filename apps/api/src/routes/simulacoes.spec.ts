import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Hono, type Context, type Next } from 'hono';
import { simulacaoRoutes } from './simulacoes.js';
import { strapiGet, strapiPut } from '../modules/strapi/strapi.client.js';

vi.mock('../modules/strapi/strapi.client.js', () => ({
  strapiGet: vi.fn(),
  strapiPost: vi.fn(),
  strapiPut: vi.fn(),
}));

vi.mock('../modules/events/event-bus.js', () => ({
  eventBus: {
    publishWithOutbox: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../modules/auth/auth.middleware.js', () => ({
  verifyJwt: async (c: Context, next: Next) => {
    c.set('user', { id: 'user-123', role: 'estudante' });
    await next();
  },
}));

vi.mock('../modules/auth/rbac.middleware.js', () => ({
  checkRole: () => async (_c: Context, next: Next) => {
    await next();
  },
}));

describe('Simulações Routes - R2.T4 Score Derivation', () => {
  const app = new Hono().route('/simulacoes', simulacaoRoutes);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve derivar score alto para persona "Cirurgião" (focusStability=95)', async () => {
    vi.mocked(strapiPut).mockResolvedValueOnce({
      data: { id: 'tent-1', score: 9.75, status: 'concluida', perfil: 'perf-1' }
    } as any);

    vi.mocked(strapiGet).mockResolvedValueOnce({
      data: [{ id: 'perf-1' }]
    } as any);

    const res = await app.request('/simulacoes/tentativas/tent-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metadata: { tipo: 2, focusStability: 95, duracaoSegundos: 300 }
      }),
    });

    expect(res.status).toBe(200);
    // analyzeFluidity(0.95) -> 9.5
    // analyzeFocus(0.95) -> 10
    // (9.5 + 10) / 2 = 9.75
    expect(strapiPut).toHaveBeenCalledWith('/tentativas/tent-1', expect.objectContaining({
      score: 9.75
    }));
  });

  it('deve derivar score baixo para persona "Hacker Hesitante" (focusStability=40)', async () => {
    vi.mocked(strapiPut).mockResolvedValueOnce({
      data: { id: 'tent-2', score: 4.75, status: 'concluida', perfil: 'perf-2' }
    } as any);

    vi.mocked(strapiGet).mockResolvedValueOnce({
      data: [{ id: 'perf-2' }]
    } as any);

    const res = await app.request('/simulacoes/tentativas/tent-2', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metadata: { tipo: 2, focusStability: 40, duracaoSegundos: 600 }
      }),
    });

    expect(res.status).toBe(200);
    // analyzeFluidity(0.4) -> 4.5
    // analyzeFocus(0.4) -> 5.0
    // (4.5 + 5.0) / 2 = 4.75
    expect(strapiPut).toHaveBeenCalledWith('/tentativas/tent-2', expect.objectContaining({
      score: 4.75
    }));
  });
});

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { reputationRoutes } from './reputation.js';
import * as reputationService from '../modules/reputation/reputation.service.js';
import type { ReputacaoBreakdown } from '@pdc/shared';

vi.mock('../modules/feature-flags/feature-flags.service.js', () => ({
  getEffectiveFlags: vi.fn(),
}));

vi.mock('../modules/auth/auth.middleware.js', () => ({
  verifyJwt: async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
    c.set('user', { id: 'user-123', role: 'estudante' });
    await next();
  },
}));

vi.mock('../modules/reputation/reputation.service.js', () => ({
  getReputacaoBreakdown: vi.fn(),
  getReputacao: vi.fn(),
}));

import { getReputacaoBreakdown } from '../modules/reputation/reputation.service.js';

describe('Reputation Routes (Canonical Mounts & Gate)', () => {
  const app = new Hono();
  // Target structure for R2.T6b
  app.route('/reputacao', reputationRoutes);
  app.route('/reputation', reputationRoutes);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar 404 para /reputacao/me se flag REPUTATION_VISIBLE estiver off (D9 requirement)', async () => {
    // Simular que o service lança um erro 404-like quando flag off
    vi.mocked(getReputacaoBreakdown).mockRejectedValueOnce({ 
      status: 404, 
      message: 'Feature Disabled' 
    });

    const res = await app.request('/reputacao/me');
    expect(res.status).toBe(404);
  });

  it('deve retornar 200 + payload válido para /reputacao/me se flag estiver on', async () => {
    const mockBreakdown: ReputacaoBreakdown = {
      score: 85,
      tier: 'OURO',
      dimensions: {
        ratingsMedia: 4.8,
        cursosPublicados: 5,
        simulacoes: 10,
        conquistas: 7,
        tempoPlataforma: 12,
        engagement: 300,
      }
    };
    vi.mocked(getReputacaoBreakdown).mockResolvedValueOnce(mockBreakdown);

    const res = await app.request('/reputacao/me');
    expect(res.status).toBe(200);
    const body = await res.json() as ReputacaoBreakdown;
    expect(body.score).toBe(85);
    expect(body.tier).toBe('OURO');
  });

  it('deve replicar comportamento idêntico no alias /reputation/me (Mirror validation)', async () => {
    vi.mocked(reputationService.getReputacaoBreakdown).mockRejectedValueOnce({ 
      status: 404 
    });

    const res = await app.request('/reputation/me');
    expect(res.status).toBe(404);
  });
});

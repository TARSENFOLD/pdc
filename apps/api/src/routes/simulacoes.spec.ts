import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Hono, type Context, type Next } from 'hono';
import { simulacaoRoutes } from './simulacoes.js';
import { strapiGet, strapiPost, strapiPut } from '../modules/strapi/strapi.client.js';
import { featureFlagService } from '../modules/feature-flags/feature-flags.service.js';
import type { StrapiListResponse, StrapiSingleResponse } from '@pdc/shared';

function listResponse<T>(data: Array<T & { id: string | number }>): StrapiListResponse<T> {
  return {
    data,
    meta: { pagination: { page: 1, pageSize: data.length, pageCount: 1, total: data.length } },
  };
}

function singleResponse<T>(data: T & { id: string | number }): StrapiSingleResponse<T> {
  return { data, meta: {} };
}

vi.mock('../modules/strapi/strapi.client.js', () => ({
  strapiGet: vi.fn(),
  strapiPost: vi.fn(),
  strapiPut: vi.fn(),
}));

vi.mock('../modules/events/event-bus.js', () => ({
  eventBus: {
    publishWithOutbox: vi.fn().mockResolvedValue({ id: 'evt-1' }),
  },
}));

vi.mock('../modules/feature-flags/feature-flags.service.js', () => ({
  featureFlagService: {
    getEffectiveFlags: vi.fn(),
  },
}));

vi.mock('../modules/auth/auth.middleware.js', () => ({
  verifyJwt: async (c: Context, next: Next) => {
    c.set('user', { id: 'user-123', role: c.req.header('x-test-role') ?? 'estudante' });
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
    vi.mocked(featureFlagService.getEffectiveFlags).mockResolvedValue({
      SIM_TIPO_2_PUBLISH_ENABLED: true,
      SIM_TIPO_3_PUBLISH_ENABLED: true,
    });
  });

  const criarPayload = {
    titulo: 'Diagnostico Tecnico',
    descricao: 'Simulacao com contexto suficiente para validacao.',
    area: 'TECNOLOGIA',
    tipo: 2,
    tipoLab: 'sandbox',
    tentativasMaximas: 0,
    criteriosAvaliacao: {
      pesos: { fluidez: 40, resiliencia: 30, foco: 30 },
    },
    iframeUrl: 'https://labs.example.com/sim',
    materiaisLab: [],
  };

  it('deve bloquear POST de simulação Tipo 2 quando a flag ALPHA está false', async () => {
    vi.mocked(featureFlagService.getEffectiveFlags).mockResolvedValueOnce({
      SIM_TIPO_2_PUBLISH_ENABLED: false,
      SIM_TIPO_3_PUBLISH_ENABLED: true,
    });

    const res = await app.request('/simulacoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(criarPayload),
    });

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      error: 'Publicação desta simulação desabilitada',
      code: 'SIM_TIPO_DISABLED',
    });
    expect(strapiPost).not.toHaveBeenCalled();
  });

  it('deve bloquear POST de simulação Tipo 2 em fail-closed quando flags falham', async () => {
    vi.mocked(featureFlagService.getEffectiveFlags).mockRejectedValueOnce(new Error('Strapi indisponivel'));

    const res = await app.request('/simulacoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(criarPayload),
    });

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      error: 'Publicação desta simulação desabilitada',
      code: 'SIM_TIPO_DISABLED',
    });
    expect(strapiPost).not.toHaveBeenCalled();
  });

  it('deve permitir POST de simulação Tipo 2 quando a flag ALPHA está true', async () => {
    vi.mocked(strapiPost).mockResolvedValueOnce(singleResponse({ id: 'sim-1', ...criarPayload }));

    const res = await app.request('/simulacoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(criarPayload),
    });

    expect(res.status).toBe(201);
    expect(strapiPost).toHaveBeenCalledWith('/simulacoes', expect.objectContaining({
      tipo: 2,
      estado: 'draft',
    }));
  });

  it('deve bloquear publicação de simulação Tipo 3 quando a flag ALPHA está false', async () => {
    vi.mocked(featureFlagService.getEffectiveFlags).mockResolvedValueOnce({
      SIM_TIPO_2_PUBLISH_ENABLED: true,
      SIM_TIPO_3_PUBLISH_ENABLED: false,
    });
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([{
      id: 'sim-3',
      titulo: 'Cenario Imersivo',
      autorId: 'user-123',
      estado: 'approved',
      tipo: 3,
      area: 'TECNOLOGIA',
    }]));

    const res = await app.request('/simulacoes/sim-3/estado', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-test-role': 'super_admin' },
      body: JSON.stringify({ estado: 'published' }),
    });

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      error: 'Publicação desta simulação desabilitada',
      code: 'SIM_TIPO_DISABLED',
    });
    expect(strapiPut).not.toHaveBeenCalled();
  });

  it('deve derivar score alto para persona "Cirurgião" (focusStability=95)', async () => {
    vi.mocked(strapiPut).mockResolvedValue(singleResponse({ id: 'tent-1', score: 9.75, status: 'concluida', perfil: 'perf-1' }));

    // Mock 1: Lookup da área da simulação
    // Mock 2: Lookup do perfilId real
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([{ id: 'tent-1', simulacao: { area: 'SAUDE' } }]))
      .mockResolvedValueOnce(listResponse([{ id: 'perf-1' }]));

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
    vi.mocked(strapiPut).mockResolvedValue(singleResponse({ id: 'tent-2', score: 4.75, status: 'concluida', perfil: 'perf-2' }));

    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([{ id: 'tent-2', simulacao: { area: 'TECNOLOGIA' } }]))
      .mockResolvedValueOnce(listResponse([{ id: 'perf-2' }]));

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

  it('deve derivar score com fluidez e foco independentes quando fluidez é fornecida', async () => {
    vi.mocked(strapiPut).mockResolvedValue(singleResponse({ id: 'tent-3', score: 7.25, status: 'concluida', perfil: 'perf-3' }));

    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([{ id: 'tent-3', simulacao: { area: 'ENGENHARIA' } }]))
      .mockResolvedValueOnce(listResponse([{ id: 'perf-3' }]));

    const res = await app.request('/simulacoes/tentativas/tent-3', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metadata: { tipo: 2, focusStability: 40, fluidityStability: 95, duracaoSegundos: 300 }
      }),
    });

    expect(res.status).toBe(200);
    // analyzeFluidity(0.95) -> 9.5
    // analyzeFocus(0.4) -> 5.0
    // (9.5 + 5.0) / 2 = 7.25
    expect(strapiPut).toHaveBeenCalledWith('/tentativas/tent-3', expect.objectContaining({
      score: 7.25
    }));
  });
});

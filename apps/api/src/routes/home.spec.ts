import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../lib/env.js', () => ({
  env: {
    JWT_SECRET: 'test-secret-at-least-32-chars-long!!',
    API_URL: 'http://localhost:3001',
    FRONTEND_URL: 'http://localhost:5173',
    NODE_ENV: 'test',
  },
}));

vi.mock('pino', () => ({
  default: vi.fn(() => ({ warn: vi.fn(), error: vi.fn(), info: vi.fn() })),
}));

vi.mock('../lib/redis.js', () => ({
  redis: { get: vi.fn(), set: vi.fn() },
}));

vi.mock('../modules/strapi/strapi.client.js', () => ({
  strapiGet: vi.fn(),
}));

vi.mock('./feed.helpers.js', () => ({
  fetchCandidates: vi.fn(),
  getItemStats: vi.fn(),
  buildFeatures: vi.fn(),
  calcRecencyScore: vi.fn(),
  calcScore: vi.fn(),
  mapConcurrent: vi.fn(),
  HYDRATION_CONCURRENCY: 10,
}));

vi.mock('../modules/feed/feed.weights.js', () => ({
  getWeights: vi.fn(),
}));

vi.mock('jose', async (importOriginal) => {
  const actual = await importOriginal<typeof import('jose')>();
  return { ...actual, jwtVerify: vi.fn() };
});

import { homeRoutes } from './home.js';
import { jwtVerify } from 'jose';
import { strapiGet } from '../modules/strapi/strapi.client.js';
import { redis } from '../lib/redis.js';
import { fetchCandidates, getItemStats, buildFeatures, calcRecencyScore, calcScore, mapConcurrent } from './feed.helpers.js';
import { getWeights } from '../modules/feed/feed.weights.js';
import type { StrapiListResponse, HomeSummary } from '@pdc/shared';

// ── Helpers ──────────────────────────────────────────────────────────────────

function listResponse<T>(data: (T & { id: string | number })[]): StrapiListResponse<T> {
  return {
    data,
    meta: { pagination: { page: 1, pageSize: data.length, pageCount: 1, total: data.length } },
  };
}

function emptyList<T>(): StrapiListResponse<T> {
  return { data: [], meta: { pagination: { page: 1, pageSize: 0, pageCount: 0, total: 0 } } };
}

function authRequest(url = 'http://localhost/'): Request {
  return new Request(url, {
    headers: { Cookie: 'access_token=fake-token' },
  });
}

const DEFAULT_WEIGHTS = {
  engagement: 0.3, completion: 0.1, rating: 0.2,
  recency: 0.2, reputation: 0.1, affinity: 0.05, time: 0.05,
};

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(jwtVerify).mockResolvedValue({
    payload: { sub: 'user-1', role: 'estudante' },
    protectedHeader: { alg: 'HS256', typ: 'access' },
  } as unknown as Awaited<ReturnType<typeof jwtVerify>>);

  vi.mocked(redis.get).mockResolvedValue(null);
  vi.mocked(redis.set).mockResolvedValue('OK');

  vi.mocked(getWeights).mockResolvedValue(DEFAULT_WEIGHTS);

  vi.mocked(fetchCandidates).mockResolvedValue([]);
  vi.mocked(getItemStats).mockResolvedValue({
    likes: 0,
    comentarios: 0,
    shares: 0,
    ratingMedia: 0,
    ratingTotal: 0,
  });
  vi.mocked(buildFeatures).mockReturnValue({ engagement: 0, completion: 0, rating: 0, recency: 0, reputation: 0, affinity: 0, time: 0 });
  vi.mocked(calcRecencyScore).mockReturnValue(0.5);
  vi.mocked(calcScore).mockReturnValue(0.5);
  vi.mocked(mapConcurrent).mockImplementation(async (items, fn) => Promise.all(items.map(fn)));

  // Default Strapi responses
  vi.mocked(strapiGet).mockImplementation((path: string) => {
    if (path === '/perfis') return Promise.resolve(listResponse([{
      id: 'perfil-1',
      xp: 100,
      reputacao: 200,
      conquistasCount: 3,
      vinkulosCount: 4,
      activeStudents: 5,
      activePrograms: 6,
      nome: 'Ana Silva',
    }]));
    if (path === '/inscricoes') return Promise.resolve(emptyList());
    if (path === '/tentativas') return Promise.resolve(emptyList());
    if (path === '/onboarding-videos') return Promise.resolve(emptyList());
    return Promise.resolve(emptyList());
  });
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('GET /app/home', () => {
  it('cache hit: retorna payload do Redis sem chamar Strapi', async () => {
    const cachedSummary: HomeSummary = {
      greeting: 'Olá, Ana!',
      personalizedMessage: 'cached',
      stats: { xp: 50, reputacao: 100, conquistasCount: 1, pendingActions: 0 },
      nextDirective: null,
      socialPulse: [],
      quickActions: [],
      recentActivitiesCursos: [],
      recentActivitiesSimulacoes: [],
      onboardingVideo: null,
      trendingComunidade: [],
      aprenderAgora: [],
    };
    vi.mocked(redis.get).mockResolvedValue(cachedSummary);

    const res = await homeRoutes.request(authRequest());

    expect(res.status).toBe(200);
    const body = await res.json() as HomeSummary;
    expect(body.personalizedMessage).toBe('cached');
    expect(strapiGet).not.toHaveBeenCalled();
    expect(fetchCandidates).not.toHaveBeenCalled();
  });

  it('cache miss: faz 4 chamadas Strapi + fetchCandidates e persiste no cache', async () => {
    const res = await homeRoutes.request(authRequest());

    expect(res.status).toBe(200);
    expect(strapiGet).toHaveBeenCalledWith('/perfis', expect.objectContaining({
      'filters[userId][$eq]': 'user-1',
      'fields': 'xp,reputacao,conquistasCount,vinkulosCount,activeStudents,activePrograms,nome',
    }));
    expect(strapiGet).toHaveBeenCalledWith('/inscricoes', expect.objectContaining({ 'filters[perfil][userId][$eq]': 'user-1' }));
    expect(strapiGet).toHaveBeenCalledWith('/tentativas', expect.objectContaining({ 'filters[perfil][userId][$eq]': 'user-1' }));
    expect(strapiGet).toHaveBeenCalledWith('/onboarding-videos', expect.objectContaining({ 'filters[role][$eq]': 'estudante' }));
    expect(fetchCandidates).toHaveBeenCalledOnce();
    expect(redis.set).toHaveBeenCalledWith('home:summary:user-1', expect.any(Object), { ex: 60 });
  });

  it('cache miss + Redis down: computa direto sem escrever cache', async () => {
    vi.mocked(redis.get).mockRejectedValue(new Error('Redis timeout'));

    const res = await homeRoutes.request(authRequest());

    expect(res.status).toBe(200);
    expect(strapiGet).toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();
  });

  it('Strapi down: degradação graceful — retorna 200 com estrutura vazia', async () => {
    // A rota usa .catch() individuais em cada Promise.all para resiliência.
    // Quando Strapi está inacessível, o home retorna 200 com dados vazios
    // em vez de 502, evitando erro visível ao utilizador (graceful degradation).
    vi.mocked(strapiGet).mockRejectedValue(new Error('Strapi 502'));

    const res = await homeRoutes.request(authRequest());

    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body).toHaveProperty('recentActivitiesCursos');
    expect(body).toHaveProperty('recentActivitiesSimulacoes');
  });

  it('user novo sem inscrições/tentativas: retorna 200 com arrays vazios', async () => {
    vi.mocked(strapiGet).mockImplementation((path: string) => {
      if (path === '/perfis') return Promise.resolve(listResponse([{ id: 'perfil-new', xp: 0, reputacao: 0, conquistasCount: 0, vinkulosCount: 0, activeStudents: 0, activePrograms: 0, nome: 'Novo User' }]));
      return Promise.resolve(emptyList());
    });

    const res = await homeRoutes.request(authRequest());

    expect(res.status).toBe(200);
    const body = await res.json() as HomeSummary;
    expect(body.recentActivitiesCursos).toEqual([]);
    expect(body.recentActivitiesSimulacoes).toEqual([]);
    expect(body.onboardingVideo).toBeNull();
    expect(body.stats.xp).toBe(0);
  });

  it('stats: usa campos persistidos do perfil', async () => {
    vi.mocked(strapiGet).mockImplementation((path: string) => {
      if (path === '/perfis') {
        return Promise.resolve(listResponse([{
          id: 'perfil-1',
          xp: 120,
          reputacao: 80,
          conquistasCount: 2,
          conquistas: [{ id: 'c1' }, { id: 'c2' }],
          vinkulosCount: 3,
          activeStudents: 4,
          activePrograms: 5,
          nome: 'Ana Silva',
        }]));
      }
      return Promise.resolve(emptyList());
    });

    const res = await homeRoutes.request(authRequest());

    expect(res.status).toBe(200);
    const body = await res.json() as HomeSummary;
    expect(body.stats.xp).toBe(120);
    expect(body.stats.reputacao).toBe(80);
    expect(body.stats.conquistasCount).toBe(2);
    expect(body.stats.vinkulosCount).toBe(3);
    expect(body.stats.activeStudents).toBe(4);
    expect(body.stats.activePrograms).toBe(5);
  });

  it('role-awareness: filtro de onboarding-videos usa role do JWT', async () => {
    vi.mocked(jwtVerify).mockResolvedValue({
      payload: { sub: 'user-2', role: 'mentor' },
      protectedHeader: { alg: 'HS256', typ: 'access' },
    } as unknown as Awaited<ReturnType<typeof jwtVerify>>);

    await homeRoutes.request(authRequest());

    expect(strapiGet).toHaveBeenCalledWith('/onboarding-videos', expect.objectContaining({ 'filters[role][$eq]': 'mentor' }));
  });

  it('particionamento correto: post vai para trendingComunidade, curso para aprenderAgora', async () => {
    const now = new Date().toISOString();
    vi.mocked(fetchCandidates).mockResolvedValue([
      { id: 'post-1', tipo: 'post', corpo: 'Post social', createdAt: now, estado: 'aprovada', publishedAt: now },
      { id: 'curso-1', tipo: 'curso', titulo: 'Curso Python', createdAt: now, publishedAt: now },
    ] as Awaited<ReturnType<typeof fetchCandidates>>);

    vi.mocked(mapConcurrent).mockImplementation(async (items, fn) => Promise.all(items.map(fn)));

    const res = await homeRoutes.request(authRequest());
    expect(res.status).toBe(200);
    const body = await res.json() as HomeSummary;

    const comunidadeIds = body.trendingComunidade.map((i) => i.id);
    const aprenderId = body.aprenderAgora.map((i) => i.id);

    expect(comunidadeIds).toContain('post-1');
    expect(aprenderId).toContain('curso-1');
    expect(comunidadeIds).not.toContain('curso-1');
    expect(aprenderId).not.toContain('post-1');
  });

  it('IDs sempre coercidos para string (INV-C6)', async () => {
    vi.mocked(strapiGet).mockImplementation((path: string) => {
      if (path === '/perfis') return Promise.resolve(listResponse([{ id: 42, xp: 10, reputacao: 5, nome: 'Test' }]));
      if (path === '/inscricoes') return Promise.resolve(listResponse([{
        id: 7,
        progressoPercentual: 50,
        ultimaAtividadeEm: new Date().toISOString(),
        curso: { id: 99, titulo: 'Curso X', capaUrl: null },
      }]));
      if (path === '/tentativas') return Promise.resolve(listResponse([{
        id: 8,
        status: 'concluida' as const,
        score: 85,
        dataInicio: new Date().toISOString(),
        simulacao: { id: 55, titulo: 'Sim Y' },
      }]));
      return Promise.resolve(emptyList());
    });

    const res = await homeRoutes.request(authRequest());
    expect(res.status).toBe(200);
    const body = await res.json() as HomeSummary;

    expect(typeof body.recentActivitiesCursos[0]?.inscricaoId).toBe('string');
    expect(body.recentActivitiesCursos[0]?.inscricaoId).toBe('7');
    expect(body.recentActivitiesSimulacoes[0]?.tentativaId).toBe('8');
    expect(body.recentActivitiesSimulacoes[0]?.simulacaoId).toBe('55');
  });

  it('não requer autenticação → 401', async () => {
    const res = await homeRoutes.request(new Request('http://localhost/'));
    expect(res.status).toBe(401);
  });
});

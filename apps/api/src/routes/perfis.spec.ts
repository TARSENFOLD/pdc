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
  redis: { get: vi.fn(), set: vi.fn(), del: vi.fn() },
}));

vi.mock('../modules/strapi/strapi.client.js', () => ({
  strapiGet: vi.fn(),
  strapiPut: vi.fn(),
  strapiPutRaw: vi.fn(),
}));

vi.mock('../modules/reputation/reputation.service.js', () => ({
  getTier: vi.fn().mockReturnValue('bronze'),
}));

vi.mock('../modules/events/event-bus.js', () => ({
  eventBus: { publishWithOutbox: vi.fn() },
}));

vi.mock('jose', async (importOriginal) => {
  const actual = await importOriginal<typeof import('jose')>();
  return { ...actual, jwtVerify: vi.fn() };
});

import { buildPerfilStrapiPayload, perfilRoutes, type PerfilStrapiPayload } from './perfis.js';
import type { UpdatePerfilPayload, StrapiListResponse } from '@pdc/shared';
import { jwtVerify } from 'jose';
import { strapiGet } from '../modules/strapi/strapi.client.js';

// ─── Payload-mapping tests (pre-existing) ────────────────────────────────────

describe('perfil routes payload mapping', () => {
  it('maps update payload fields to Strapi perfil attributes', () => {
    const input: UpdatePerfilPayload = {
      bio: 'Bio com menos de mil caracteres.',
      avatarUrl: 'https://cdn.pdc.test/avatar.jpg',
      visibilitySettings: {
        email: 'privado',
        telefone: 'privado',
        miniFeed: 'publico',
        vinculos: 'publico',
        bio: 'publico',
        socialLinks: 'conexoes',
        areasInteresse: 'publico',
        competencias: 'publico',
        historicoProfissional: 'conexoes',
        formacaoAcademica: 'conexoes',
      },
    };
    const payload: PerfilStrapiPayload = buildPerfilStrapiPayload(input);

    expect(payload).toEqual({
      bio: 'Bio com menos de mil caracteres.',
      avatarUrl: 'https://cdn.pdc.test/avatar.jpg',
      visibilitySettings: {
        email: 'privado',
        telefone: 'privado',
        miniFeed: 'publico',
        vinculos: 'publico',
        bio: 'publico',
        socialLinks: 'conexoes',
        areasInteresse: 'publico',
        competencias: 'publico',
        historicoProfissional: 'conexoes',
        formacaoAcademica: 'conexoes',
      },
    });
  });

  it('keeps null avatarUrl so Strapi can remove the persisted R2 avatar', () => {
    const input: UpdatePerfilPayload = { avatarUrl: null };
    expect(buildPerfilStrapiPayload(input)).toEqual({ avatarUrl: null });
  });
});

// ─── GET /:id route characterization (ADR-029) ───────────────────────────────
// INV-C4: response is always { data: PublicProfile }, never raw Profile.
// See: docs/decisoes/adr-029-perfis-data-wrapping.md

describe('GET /perfis/:id — route characterization', () => {
  function listResponse<T>(data: Array<T & { id: string | number }>): StrapiListResponse<T> {
    return {
      data,
      meta: { pagination: { page: 1, pageSize: data.length, pageCount: 1, total: data.length } },
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(jwtVerify).mockResolvedValue({
      payload: { sub: 'user-1', role: 'mentor' },
      protectedHeader: { alg: 'HS256' },
    } as unknown as Awaited<ReturnType<typeof jwtVerify>>);
  });

  // ADR-029: top-level is { data: PublicProfile }, email/telefone absent for anonymous viewer
  it('returns serialized public mentor profile for a third-party viewer', async () => {
    vi.mocked(strapiGet).mockImplementation((path: string) => {
      if (path === '/perfis') {
        return Promise.resolve(
          listResponse([{
            id: 'perfil-42',
            userId: 'target-user',
            nome: 'Maria Silva',
            tipo: 'mentor',
            bio: 'Mentora experiente',
            email: 'maria@pdc.test',
            telefone: '+244900000000',
            reputacao: 500,
            visibilitySettings: { bio: 'publico' },
          }]),
        );
      }
      return Promise.resolve(listResponse([]));
    });

    const res = await perfilRoutes.request('/target-user', {
      headers: { cookie: 'access_token=test-token' },
    });

    expect(res.status).toBe(200);
    const json = await res.json() as { data: { nome: string; role: string; bio: string } };
    expect(json.data.nome).toBe('Maria Silva');
    expect(json.data.role).toBe('mentor');
    expect(json.data.bio).toBe('Mentora experiente');
    expect(json.data).not.toHaveProperty('email');
    expect(json.data).not.toHaveProperty('telefone');
  });

  // ADR-029: self-view skips vinculos lookup; { data } envelope still applies
  it('self request (requesterId === userId) does not query vinculos', async () => {
    vi.mocked(strapiGet).mockImplementation((path: string) => {
      if (path === '/perfis') {
        return Promise.resolve(
          listResponse([{
            id: 'perfil-1',
            userId: 'user-1',
            nome: 'Self User',
            tipo: 'mentor',
            bio: 'My own bio',
            reputacao: 100,
            visibilitySettings: null,
          }]),
        );
      }
      return Promise.resolve(listResponse([]));
    });

    const res = await perfilRoutes.request('/user-1', {
      headers: { cookie: 'access_token=test-token' },
    });

    expect(res.status).toBe(200);
    const json = await res.json() as { data: { bio: string } };
    expect(json.data.bio).toBe('My own bio');
    expect(vi.mocked(strapiGet)).not.toHaveBeenCalledWith('/vinculos', expect.anything());
  });

  // ADR-029: missing perfil returns 404 with no legacy /users/:id fallback
  it('returns 404 instead of falling back to raw legacy user endpoint', async () => {
    vi.mocked(strapiGet).mockResolvedValue(listResponse([]));

    const res = await perfilRoutes.request('/user-99', {
      headers: { cookie: 'access_token=test-token' },
    });

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ error: 'Perfil não encontrado' });
    expect(vi.mocked(strapiGet)).not.toHaveBeenCalledWith('/users/user-99', expect.anything());
  });

  // ADR-029: bio visible to connected viewer when visibilitySettings.bio='conexoes'
  it('connected viewer can see bio with visibilitySettings=conexoes', async () => {
    vi.mocked(strapiGet).mockImplementation((path: string) => {
      if (path === '/perfis') {
        return Promise.resolve(
          listResponse([{
            id: 'perfil-7',
            userId: 'target-user-2',
            nome: 'Carlos Mentor',
            tipo: 'mentor',
            bio: 'Bio visível para conexões',
            reputacao: 0,
            visibilitySettings: { bio: 'conexoes' },
          }]),
        );
      }
      if (path === '/vinculos') {
        return Promise.resolve(listResponse([{ id: 'v-1', status: 'aprovado' }]));
      }
      return Promise.resolve(listResponse([]));
    });

    const res = await perfilRoutes.request('/target-user-2', {
      headers: { cookie: 'access_token=test-token' },
    });

    expect(res.status).toBe(200);
    const json = await res.json() as { data: { bio: string } };
    expect(json.data.bio).toBe('Bio visível para conexões');
  });

  // ADR-029: bio hidden from non-connected viewer when visibilitySettings.bio='conexoes'
  it('non-connected viewer cannot see bio with visibilitySettings=conexoes', async () => {
    vi.mocked(strapiGet).mockImplementation((path: string) => {
      if (path === '/perfis') {
        return Promise.resolve(
          listResponse([{
            id: 'perfil-8',
            userId: 'target-user-3',
            nome: 'Ana Estudante',
            tipo: 'estudante',
            bio: 'Bio privada',
            reputacao: 0,
            visibilitySettings: { bio: 'conexoes' },
          }]),
        );
      }
      return Promise.resolve(listResponse([]));
    });

    const res = await perfilRoutes.request('/target-user-3', {
      headers: { cookie: 'access_token=test-token' },
    });

    expect(res.status).toBe(200);
    const json = await res.json() as { data: { bio: string | undefined } };
    expect(json.data.bio).toBeUndefined();
  });
});

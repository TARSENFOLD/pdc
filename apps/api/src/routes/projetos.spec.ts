import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono, type Context, type Next } from 'hono';
import { projetoRoutes } from './projetos.js';
import { strapiGet, strapiPost, strapiPut, strapiDelete } from '../modules/strapi/strapi.client.js';
import { DomainEventName } from '../modules/events/types.js';
import type { StrapiListResponse, StrapiSingleResponse } from '@pdc/shared';

const publishWithOutboxMock = vi.hoisted(() => vi.fn().mockResolvedValue({ id: 'evt-1' }));

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
  strapiDelete: vi.fn(),
}));

vi.mock('../modules/events/event-bus.js', () => ({
  eventBus: {
    publishWithOutbox: publishWithOutboxMock,
  },
}));

vi.mock('../middleware/requireApproved.js', () => ({
  requireApproved: () => async (_c: Context, next: Next) => {
    await next();
  },
}));

vi.mock('../modules/auth/auth.middleware.js', () => ({
  verifyJwt: async (c: Context, next: Next) => {
    c.set('user', {
      id: c.req.header('x-test-user') ?? 'user-1',
      role: c.req.header('x-test-role') ?? 'estudante',
      perfilId: c.req.header('x-test-perfil') ?? undefined,
    });
    await next();
  },
  optionalJwt: async (c: Context, next: Next) => {
    const testUser = c.req.header('x-test-user');
    if (testUser) {
      c.set('user', {
        id: testUser,
        role: c.req.header('x-test-role') ?? 'estudante',
        perfilId: c.req.header('x-test-perfil') ?? undefined,
      });
    }
    await next();
  },
}));

const baseProjeto = {
  id: 'proj-1',
  titulo: 'Sistema de Rastreio Académico',
  abstract: 'Plataforma open-source para rastreio de percurso académico com IA.',
  modos: ['exposicao'],
  estado: 'published' as const,
  visibilidade: 'publico',
  tags: [],
  votos: [],
  acessoCoreACL: [],
  historicoEstados: [],
  autor: { id: 'perfil-autor', userId: 'user-autor', nome: 'Ana Silva' },
};

describe('projetoRoutes E2E contracts', () => {
  const app = new Hono().route('/projetos', projetoRoutes);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(strapiGet).mockReset();
    vi.mocked(strapiPost).mockReset();
    vi.mocked(strapiPut).mockReset();
    vi.mocked(strapiDelete).mockReset();
    publishWithOutboxMock.mockReset().mockResolvedValue({ id: 'evt-1' });
  });

  // ─── Catalog ────────────────────────────────────────────────────────────────

  describe('GET /projetos', () => {
    it('retorna apenas projetos published+publico para visitante anónimo', async () => {
      // No user → resolvePerfilId skipped, strapiGet called once for catalog
      vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([baseProjeto]));

      const res = await app.request('/projetos');

      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('pagination');
      // estado=published forced in query params when not moderador
      expect(strapiGet).toHaveBeenCalledWith('/projetos', expect.objectContaining({
        'filters[estado][$eq]': 'published',
        'filters[visibilidade][$eq]': 'publico',
      }));
    });

    it('moderador pode filtrar por estado diferente de published', async () => {
      vi.mocked(strapiGet)
        .mockResolvedValueOnce(listResponse([{ id: 'perfil-mod' }])) // resolvePerfilId
        .mockResolvedValueOnce(listResponse([]));                     // catalog

      const res = await app.request('/projetos?estado=review', {
        headers: { 'x-test-user': 'user-mod', 'x-test-role': 'moderador' },
      });

      expect(res.status).toBe(200);
      expect(strapiGet).toHaveBeenLastCalledWith('/projetos', expect.objectContaining({
        'filters[estado][$eq]': 'review',
      }));
      // visibilidade filter NOT applied for moderador
      const lastCall = vi.mocked(strapiGet).mock.calls.at(-1)?.[1] as Record<string, string> | undefined;
      expect(lastCall?.['filters[visibilidade][$eq]']).toBeUndefined();
    });

    it('core é removido para utilizador sem acesso ACL', async () => {
      const projetoComCore = {
        ...baseProjeto,
        core: 'Segredo técnico do projeto',
        acessoCoreACL: [],
      };
      vi.mocked(strapiGet)
        .mockResolvedValueOnce(listResponse([{ id: 'perfil-outro' }])) // resolvePerfilId
        .mockResolvedValueOnce(listResponse([projetoComCore]));         // catalog

      const res = await app.request('/projetos', {
        headers: { 'x-test-user': 'user-outro', 'x-test-role': 'estudante' },
      });

      expect(res.status).toBe(200);
      const body = await res.json() as { data: Record<string, unknown>[] };
      expect(body.data[0]).not.toHaveProperty('core');
    });

    it('autor vê o seu próprio core no catálogo', async () => {
      const projetoComCore = {
        ...baseProjeto,
        core: 'Segredo técnico do projeto',
        autor: { id: 'perfil-autor', userId: 'user-autor', nome: 'Ana' },
        acessoCoreACL: [],
      };
      vi.mocked(strapiGet)
        .mockResolvedValueOnce(listResponse([{ id: 'perfil-autor' }])) // resolvePerfilId
        .mockResolvedValueOnce(listResponse([projetoComCore]));

      const res = await app.request('/projetos', {
        headers: { 'x-test-user': 'user-autor', 'x-test-role': 'estudante' },
      });

      expect(res.status).toBe(200);
      const body = await res.json() as { data: Record<string, unknown>[] };
      expect(body.data[0]).toHaveProperty('core', 'Segredo técnico do projeto');
    });
  });

  // ─── Detail ─────────────────────────────────────────────────────────────────

  describe('GET /projetos/:id', () => {
    it('retorna projeto published para visitante anónimo', async () => {
      // No user → resolvePerfilId not called; single strapiGet for the projeto
      vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([baseProjeto]));

      const res = await app.request('/projetos/proj-1');

      expect(res.status).toBe(200);
      const body = await res.json() as { data: Record<string, unknown>[] };
      expect(body.data[0]).toHaveProperty('id', 'proj-1');
      expect(body.data[0]).not.toHaveProperty('core');
    });

    it('projeto privado não é visível para estranhos — 404', async () => {
      const projetoPrivado = { ...baseProjeto, visibilidade: 'privado' };
      vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([projetoPrivado]));

      const res = await app.request('/projetos/proj-1');

      expect(res.status).toBe(404);
    });

    it('normalizeAutorId: autor.id numérico é coercido para string na comparação', async () => {
      const projetoNumericId = {
        ...baseProjeto,
        core: 'Núcleo técnico',
        acessoCoreACL: [],
        autor: { id: 42 as unknown as string, userId: 'user-autor', nome: 'Ana' },
      };
      vi.mocked(strapiGet)
        .mockResolvedValueOnce(listResponse([{ id: 'perfil-autor' }])) // resolvePerfilId
        .mockResolvedValueOnce(listResponse([projetoNumericId]));       // projeto detail

      const res = await app.request('/projetos/proj-1', {
        headers: { 'x-test-user': 'user-autor', 'x-test-role': 'estudante' },
      });

      expect(res.status).toBe(200);
      const body = await res.json() as { data: Record<string, unknown>[] };
      // autor com id numérico 42 → normalizado para '42', perfil 'perfil-autor' ≠ '42'
      // Logo core é removido (autor não é reconhecido como dono)
      expect(body.data[0]).not.toHaveProperty('core');
    });

    it('utilizador com ACL aprovado vê o core', async () => {
      const projetoComACL = {
        ...baseProjeto,
        core: 'Núcleo técnico',
        acessoCoreACL: [{ perfilId: 'perfil-convidado', estado: 'aprovado' as const, solicitadoEm: '2026-01-01T00:00:00.000Z' }],
      };
      vi.mocked(strapiGet)
        .mockResolvedValueOnce(listResponse([{ id: 'perfil-convidado' }])) // resolvePerfilId
        .mockResolvedValueOnce(listResponse([projetoComACL]));

      const res = await app.request('/projetos/proj-1', {
        headers: { 'x-test-user': 'user-convidado', 'x-test-role': 'estudante' },
      });

      expect(res.status).toBe(200);
      const body = await res.json() as { data: Record<string, unknown>[] };
      expect(body.data[0]).toHaveProperty('core', 'Núcleo técnico');
    });
  });

  // ─── Create ─────────────────────────────────────────────────────────────────

  describe('POST /projetos', () => {
    const createPayload = {
      titulo: 'Plataforma de Rastreio',
      abstract: 'Rastreio académico com IA e dados abertos para Angola.',
      modos: ['exposicao'],
      tags: [],
    };

    it('estudante publica projeto diretamente — PROJETO_PUBLICADO emitido', async () => {
      vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([{ id: 9 }]));
      vi.mocked(strapiPost).mockResolvedValueOnce(singleResponse({
        id: 41,
        documentId: 'doc-proj-41',
        ...createPayload,
        estado: 'published',
        autor: { id: 'perfil-est', userId: 'user-est', nome: 'Estudante' },
      }));

      const res = await app.request('/projetos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user': 'user-est',
          'x-test-role': 'estudante',
        },
        body: JSON.stringify(createPayload),
      });

      expect(res.status).toBe(201);
      expect(strapiPost).toHaveBeenCalledWith('/projetos', expect.objectContaining({
        autor: '9',
        estado: 'published',
        acessoCoreACL: [],
        votos: [],
      }));
      expect(publishWithOutboxMock).toHaveBeenCalledWith(DomainEventName.PROJETO_PUBLICADO, expect.objectContaining({
        projetoId: 'doc-proj-41',
        autorId: '9',
      }));
      expect(await res.json()).toMatchObject({ id: 'doc-proj-41', documentId: 'doc-proj-41' });
    });

    it('estado inicial é sempre published', async () => {
      vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([{ id: 'perfil-inst' }]));
      vi.mocked(strapiPost).mockResolvedValueOnce(singleResponse({
        id: 'proj-2',
        ...createPayload,
        estado: 'published',
      }));

      const res = await app.request('/projetos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user': 'user-inst',
          'x-test-role': 'instituicao',
        },
        body: JSON.stringify({ ...createPayload, estado: 'published' }),
      });

      expect(res.status).toBe(201);
      expect(strapiPost).toHaveBeenCalledWith('/projetos', expect.objectContaining({
        estado: 'published',
      }));
    });

    it('perfil não encontrado → 404', async () => {
      vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([])); // resolvePerfilId returns null

      const res = await app.request('/projetos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user': 'user-sem-perfil',
          'x-test-role': 'estudante',
        },
        body: JSON.stringify(createPayload),
      });

      expect(res.status).toBe(404);
    });
  });

  // ─── Access Request ──────────────────────────────────────────────────────────

  describe('POST /projetos/:id/solicitar-acesso', () => {
    it('adiciona entrada ACL pendente e emite evento', async () => {
      vi.mocked(strapiGet)
        .mockResolvedValueOnce(listResponse([{ id: 'perfil-req' }]))           // resolvePerfilId
        .mockResolvedValueOnce(listResponse([{ ...baseProjeto, acessoCoreACL: [] }])) // load projeto
        .mockResolvedValueOnce(listResponse([]));                                 // check duplicados canónicos
      vi.mocked(strapiPost).mockResolvedValueOnce(singleResponse({ id: 'pedido-1' }));
      vi.mocked(strapiPut).mockResolvedValueOnce(singleResponse({ id: 'proj-1' }));

      const res = await app.request('/projetos/proj-1/solicitar-acesso', {
        method: 'POST',
        headers: { 'x-test-user': 'user-req', 'x-test-role': 'estudante' },
      });

      expect(res.status).toBe(200);
      expect(strapiPut).toHaveBeenCalledWith('/projetos/proj-1', expect.objectContaining({
        acessoCoreACL: expect.arrayContaining([
          expect.objectContaining({ perfilId: 'perfil-req', estado: 'pendente' }),
        ]) as unknown,
      }));
      expect(publishWithOutboxMock).toHaveBeenCalledWith(DomainEventName.PROJETO_ACESSO_SOLICITADO, expect.objectContaining({
        projetoId: 'proj-1',
      }));
    });

    it('pedido duplicado retorna 400', async () => {
      vi.mocked(strapiGet)
        .mockResolvedValueOnce(listResponse([{ id: 'perfil-req' }]))
        .mockResolvedValueOnce(listResponse([{
          ...baseProjeto,
          acessoCoreACL: [{
            perfilId: 'perfil-req',
            estado: 'pendente' as const,
            solicitadoEm: '2026-01-01T00:00:00.000Z',
          }],
        }]));

      const res = await app.request('/projetos/proj-1/solicitar-acesso', {
        method: 'POST',
        headers: { 'x-test-user': 'user-req', 'x-test-role': 'estudante' },
      });

      expect(res.status).toBe(400);
    });
  });

  // ─── ACL Management ─────────────────────────────────────────────────────────

  describe('PATCH /projetos/:id/acl', () => {
    it('autor aprova pedido de acesso — PROJETO_ACESSO_CONCEDIDO emitido', async () => {
      vi.mocked(strapiGet)
        .mockResolvedValueOnce(listResponse([{
          ...baseProjeto,
          acessoCoreACL: [{
            perfilId: 'perfil-req',
            estado: 'pendente' as const,
            solicitadoEm: '2026-01-01T00:00:00.000Z',
          }],
          autor: { id: 'perfil-autor', userId: 'user-autor', nome: 'Ana' },
        }]))
        .mockResolvedValueOnce(listResponse([{
          id: 'pedido-1',
          perfilSolicitante: { id: 'perfil-req' },
          status: 'pendente',
        }]));
      vi.mocked(strapiPut).mockResolvedValueOnce(singleResponse({ id: 'proj-1' }));

      const res = await app.request('/projetos/proj-1/acl', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user': 'user-autor',
          'x-test-role': 'estudante',
        },
        body: JSON.stringify({ perfilId: 'perfil-req', acao: 'aprovar' }),
      });

      expect(res.status).toBe(200);
      expect(strapiPut).toHaveBeenCalledWith('/projetos/proj-1', expect.objectContaining({
        acessoCoreACL: expect.arrayContaining([
          expect.objectContaining({ perfilId: 'perfil-req', estado: 'aprovado' }),
        ]) as unknown,
      }));
      expect(publishWithOutboxMock).toHaveBeenCalledWith(DomainEventName.PROJETO_ACESSO_CONCEDIDO, expect.objectContaining({
        projetoId: 'proj-1',
        targetId: 'perfil-req',
      }));
    });

    it('não-autor recebe 403', async () => {
      vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([{
        ...baseProjeto,
        acessoCoreACL: [{ perfilId: 'perfil-req', estado: 'pendente' as const, solicitadoEm: '2026-01-01T00:00:00.000Z' }],
        autor: { id: 'perfil-autor', userId: 'user-autor', nome: 'Ana' },
      }]));

      const res = await app.request('/projetos/proj-1/acl', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user': 'user-intruso',
          'x-test-role': 'estudante',
        },
        body: JSON.stringify({ perfilId: 'perfil-req', acao: 'aprovar' }),
      });

      expect(res.status).toBe(403);
      expect(strapiPut).not.toHaveBeenCalled();
    });
  });

  // ─── Votes ──────────────────────────────────────────────────────────────────

  describe('GET /projetos/:id/votos', () => {
    it('retorna contagens e estado do utilizador autenticado', async () => {
      const projetoComVotos = {
        ...baseProjeto,
        votos: [
          { perfilId: 'perfil-a', tipo: 'endorsement' as const, criadoEm: '2026-01-01T00:00:00.000Z' },
          { perfilId: 'perfil-a', tipo: 'voto' as const, criadoEm: '2026-01-01T00:00:00.000Z' },
          { perfilId: 'perfil-b', tipo: 'voto' as const, criadoEm: '2026-01-01T00:00:00.000Z' },
        ],
      };
      vi.mocked(strapiGet)
        .mockResolvedValueOnce(listResponse([projetoComVotos]))         // load projeto
        .mockResolvedValueOnce(listResponse([{ id: 'perfil-a' }]));    // resolvePerfilId

      const res = await app.request('/projetos/proj-1/votos', {
        headers: { 'x-test-user': 'user-a', 'x-test-role': 'estudante' },
      });

      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      expect(body).toMatchObject({
        endorsements: 1,
        votos_count: 2,
        endorsed: true,
        voted: true,
      });
    });

    it('visitante anónimo vê contagens mas sem estado pessoal', async () => {
      vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([{
        ...baseProjeto,
        votos: [{ perfilId: 'perfil-a', tipo: 'endorsement' as const, criadoEm: '2026-01-01T00:00:00.000Z' }],
      }]));

      const res = await app.request('/projetos/proj-1/votos');

      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      expect(body).toMatchObject({ endorsements: 1, votos_count: 0, endorsed: false, voted: false });
    });
  });

  describe('POST /projetos/:id/votos', () => {
    it('endorse dispara PROJETO_ENDORSEMENT_RECEBIDO', async () => {
      vi.mocked(strapiGet)
        .mockResolvedValueOnce(listResponse([{ id: 'perfil-voter' }])) // resolvePerfilId
        .mockResolvedValueOnce(listResponse([{                          // load projeto
          ...baseProjeto,
          votos: [],
          autor: { id: 'perfil-autor', userId: 'user-autor', nome: 'Ana' },
        }]));
      vi.mocked(strapiPut).mockResolvedValueOnce(singleResponse({ id: 'proj-1' }));

      const res = await app.request('/projetos/proj-1/votos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user': 'user-voter',
          'x-test-role': 'estudante',
        },
        body: JSON.stringify({ tipo: 'endorsement' }),
      });

      expect(res.status).toBe(200);
      expect(publishWithOutboxMock).toHaveBeenCalledWith(DomainEventName.PROJETO_ENDORSEMENT_RECEBIDO, expect.objectContaining({
        projetoId: 'proj-1',
        autorId: 'perfil-voter',
      }));
    });

    it('autor não pode endorsar o seu próprio projeto', async () => {
      vi.mocked(strapiGet)
        .mockResolvedValueOnce(listResponse([{ id: 'perfil-autor' }]))
        .mockResolvedValueOnce(listResponse([{
          ...baseProjeto,
          autor: { id: 'perfil-autor', userId: 'user-autor', nome: 'Ana' },
        }]));

      const res = await app.request('/projetos/proj-1/votos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user': 'user-autor',
          'x-test-role': 'estudante',
        },
        body: JSON.stringify({ tipo: 'endorsement' }),
      });

      expect(res.status).toBe(403);
      expect(strapiPut).not.toHaveBeenCalled();
    });

    it('voto duplicado retorna contagem atual sem errar', async () => {
      vi.mocked(strapiGet)
        .mockResolvedValueOnce(listResponse([{ id: 'perfil-voter' }]))
        .mockResolvedValueOnce(listResponse([{
          ...baseProjeto,
          votos: [{ perfilId: 'perfil-voter', tipo: 'voto' as const, criadoEm: '2026-01-01T00:00:00.000Z' }],
          autor: { id: 'perfil-autor', userId: 'user-autor', nome: 'Ana' },
        }]));

      const res = await app.request('/projetos/proj-1/votos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user': 'user-voter',
          'x-test-role': 'estudante',
        },
        body: JSON.stringify({ tipo: 'voto' }),
      });

      expect(res.status).toBe(200);
      expect(strapiPut).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /projetos/:id/votos', () => {
    it('remove voto existente e retorna nova contagem', async () => {
      vi.mocked(strapiGet)
        .mockResolvedValueOnce(listResponse([{ id: 'perfil-voter' }])) // resolvePerfilId
        .mockResolvedValueOnce(listResponse([{                          // load projeto
          ...baseProjeto,
          votos: [{ perfilId: 'perfil-voter', tipo: 'voto' as const, criadoEm: '2026-01-01T00:00:00.000Z' }],
        }]));
      vi.mocked(strapiPut).mockResolvedValueOnce(singleResponse({ id: 'proj-1' }));

      const res = await app.request('/projetos/proj-1/votos?tipo=voto', {
        method: 'DELETE',
        headers: { 'x-test-user': 'user-voter', 'x-test-role': 'estudante' },
      });

      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      expect(body).toMatchObject({ count: 0, voted: false });
    });

    it('parâmetro tipo inválido → 400', async () => {
      const res = await app.request('/projetos/proj-1/votos?tipo=invalido', {
        method: 'DELETE',
        headers: { 'x-test-user': 'user-voter', 'x-test-role': 'estudante' },
      });

      expect(res.status).toBe(400);
    });
  });

  // ─── Delete ─────────────────────────────────────────────────────────────────

  describe('DELETE /projetos/:id', () => {
    it('autor pode eliminar o seu projeto', async () => {
      vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([{
        ...baseProjeto,
        autor: { id: 'perfil-autor', userId: 'user-autor', nome: 'Ana' },
      }]));
      vi.mocked(strapiDelete).mockResolvedValueOnce({});

      const res = await app.request('/projetos/proj-1', {
        method: 'DELETE',
        headers: { 'x-test-user': 'user-autor', 'x-test-role': 'estudante' },
      });

      expect(res.status).toBe(200);
      expect(strapiDelete).toHaveBeenCalledWith('/projetos/proj-1');
    });

    it('moderador pode eliminar projeto de outro utilizador', async () => {
      vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([{
        ...baseProjeto,
        autor: { id: 'perfil-autor', userId: 'user-autor', nome: 'Ana' },
      }]));
      vi.mocked(strapiDelete).mockResolvedValueOnce({});

      const res = await app.request('/projetos/proj-1', {
        method: 'DELETE',
        headers: { 'x-test-user': 'user-mod', 'x-test-role': 'moderador' },
      });

      expect(res.status).toBe(200);
      expect(strapiDelete).toHaveBeenCalledWith('/projetos/proj-1');
    });

    it('estudante sem ser autor recebe 403', async () => {
      vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([{
        ...baseProjeto,
        autor: { id: 'perfil-autor', userId: 'user-autor', nome: 'Ana' },
      }]));

      const res = await app.request('/projetos/proj-1', {
        method: 'DELETE',
        headers: { 'x-test-user': 'user-intruso', 'x-test-role': 'estudante' },
      });

      expect(res.status).toBe(403);
      expect(strapiDelete).not.toHaveBeenCalled();
    });
  });

  // ─── Estado Transitions ─────────────────────────────────────────────────────

  describe('PATCH /projetos/:id/estado', () => {
    it('autor submete para review (draft → review) — PROJETO_SUBMETIDO_PARA_REVISAO emitido', async () => {
      vi.mocked(strapiGet)
        .mockResolvedValueOnce(listResponse([{ id: 'perfil-autor' }])) // resolvePerfilId
        .mockResolvedValueOnce(listResponse([{                          // load projeto
          ...baseProjeto,
          estado: 'draft' as const,
          historicoEstados: [],
          autor: { id: 'perfil-autor', userId: 'user-autor', nome: 'Ana' },
        }]));
      vi.mocked(strapiPut).mockResolvedValueOnce(singleResponse({ id: 'proj-1' }));

      const res = await app.request('/projetos/proj-1/estado', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user': 'user-autor',
          'x-test-role': 'estudante',
        },
        body: JSON.stringify({ novoEstado: 'review' }),
      });

      expect(res.status).toBe(200);
      expect(strapiPut).toHaveBeenCalledWith('/projetos/proj-1', expect.objectContaining({ estado: 'review' }));
      expect(publishWithOutboxMock).toHaveBeenCalledWith(DomainEventName.PROJETO_SUBMETIDO_PARA_REVISAO, expect.objectContaining({
        projetoId: 'proj-1',
        autorId: 'perfil-autor',
      }));
    });

    it('moderador aprova projeto (review → approved) — PROJETO_APROVADO emitido', async () => {
      vi.mocked(strapiGet)
        .mockResolvedValueOnce(listResponse([{ id: 'perfil-mod' }]))
        .mockResolvedValueOnce(listResponse([{
          ...baseProjeto,
          estado: 'review' as const,
          historicoEstados: [],
          autor: { id: 'perfil-autor', userId: 'user-autor', nome: 'Ana' },
        }]));
      vi.mocked(strapiPut).mockResolvedValueOnce(singleResponse({ id: 'proj-1' }));

      const res = await app.request('/projetos/proj-1/estado', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user': 'user-mod',
          'x-test-role': 'moderador',
        },
        body: JSON.stringify({ novoEstado: 'approved' }),
      });

      expect(res.status).toBe(200);
      expect(publishWithOutboxMock).toHaveBeenCalledWith(DomainEventName.PROJETO_APROVADO, expect.objectContaining({
        projetoId: 'proj-1',
        aprovadorId: 'perfil-mod',
      }));
    });

    it('transição não permitida pelo RBAC → 403', async () => {
      // Autor não pode fazer draft → approved (só review → approved é do moderador)
      vi.mocked(strapiGet)
        .mockResolvedValueOnce(listResponse([{ id: 'perfil-autor' }]))
        .mockResolvedValueOnce(listResponse([{
          ...baseProjeto,
          estado: 'draft' as const,
          historicoEstados: [],
          autor: { id: 'perfil-autor', userId: 'user-autor', nome: 'Ana' },
        }]));

      const res = await app.request('/projetos/proj-1/estado', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user': 'user-autor',
          'x-test-role': 'estudante',
        },
        body: JSON.stringify({ novoEstado: 'approved' }),
      });

      expect(res.status).toBe(403);
      expect(strapiPut).not.toHaveBeenCalled();
    });
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono, type Context, type Next } from 'hono';
import type { StrapiListResponse, StrapiSingleResponse } from '@pdc/shared';
import { vinculoRoutes } from './vinculos.js';
import { strapiGet, strapiPost, strapiPut } from '../modules/strapi/strapi.client.js';

const publishWithOutboxMock = vi.hoisted(() => vi.fn().mockResolvedValue({ id: 'evt-1' }));
const authUser = { id: 'user-1', role: 'estudante', isMinor: false };

interface PerfilMini {
  id: number;
  documentId?: string;
  nome: string;
  userId: string;
}

interface VinculoMini {
  id: number;
  documentId?: string;
  solicitante: PerfilMini;
  destinatario: PerfilMini;
  status: string;
  criadoEm: string;
}

vi.mock('../modules/strapi/strapi.client.js', () => ({
  strapiGet: vi.fn(),
  strapiPost: vi.fn(),
  strapiPut: vi.fn(),
}));

vi.mock('../modules/events/event-bus.js', () => ({
  eventBus: { publishWithOutbox: publishWithOutboxMock },
}));

vi.mock('../modules/auth/auth.middleware.js', () => ({
  verifyJwt: async (c: Context, next: Next) => {
    c.set('user', authUser);
    await next();
  },
}));

function listResponse<T>(data: T[]): StrapiListResponse<T> {
  return {
    data: data as Array<T & { id: string | number }>,
    meta: { pagination: { page: 1, pageSize: 25, pageCount: 1, total: data.length } },
  };
}

function singleResponse<T>(data: T): StrapiSingleResponse<T> {
  return { data: data as T & { id: string | number }, meta: {} };
}

const solicitante: PerfilMini = { id: 1, documentId: 'perfil-doc-1', nome: 'Ana', userId: 'user-1' };
const destinatario: PerfilMini = { id: 2, documentId: 'perfil-doc-2', nome: 'Bruno', userId: 'user-2' };

describe('vinculoRoutes', () => {
  const app = new Hono().route('/vinculos', vinculoRoutes);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devolve status null quando não existe vínculo com o perfil alvo', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([solicitante]))
      .mockResolvedValueOnce(listResponse([destinatario]))
      .mockResolvedValueOnce(listResponse([]));

    const response = await app.request('/vinculos/status?targetId=perfil-doc-2');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: null, vinculoId: null, isSender: false });
  });

  it('devolve status e direção quando já existe vínculo com o perfil alvo', async () => {
    const vinculo: VinculoMini = {
      id: 9,
      documentId: 'vinculo-doc-9',
      solicitante,
      destinatario,
      status: 'aprovado',
      criadoEm: '2026-01-01T00:00:00.000Z',
    };
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([solicitante]))
      .mockResolvedValueOnce(listResponse([destinatario]))
      .mockResolvedValueOnce(listResponse([vinculo]));

    const response = await app.request('/vinculos/status?targetId=perfil-doc-2');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'aprovado', vinculoId: 'vinculo-doc-9', isSender: true });
  });

  it('bloqueia pedido de vínculo consigo mesmo', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([solicitante]))
      .mockResolvedValueOnce(listResponse([solicitante]));

    const response = await app.request('/vinculos/perfil-doc-1/pedir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectionType: 'student-student' }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Não podes criar vínculo contigo mesmo' });
    expect(strapiPost).not.toHaveBeenCalled();
  });

  it('rejeita duplicado quando já há pedido pendente ou aprovado entre os perfis', async () => {
    const vinculo: VinculoMini = {
      id: 9,
      documentId: 'vinculo-doc-9',
      solicitante,
      destinatario,
      status: 'pendente',
      criadoEm: '2026-01-01T00:00:00.000Z',
    };
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([solicitante]))
      .mockResolvedValueOnce(listResponse([destinatario]))
      .mockResolvedValueOnce(listResponse([vinculo]));

    const response = await app.request('/vinculos/perfil-doc-2/pedir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectionType: 'student-student' }),
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: 'Já existe um vínculo ou pedido pendente com este perfil' });
    expect(strapiPost).not.toHaveBeenCalled();
  });

  it('cria pedido usando documentId canónico do destinatário', async () => {
    vi.mocked(strapiGet)
      .mockResolvedValueOnce(listResponse([solicitante]))
      .mockResolvedValueOnce(listResponse([destinatario]))
      .mockResolvedValueOnce(listResponse([]));
    vi.mocked(strapiPost).mockResolvedValueOnce(singleResponse({
      id: 10,
      documentId: 'vinculo-doc-10',
      solicitante,
      destinatario,
      status: 'pendente',
      criadoEm: '2026-01-01T00:00:00.000Z',
    }));

    const response = await app.request('/vinculos/perfil-doc-2/pedir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectionType: 'student-mentor' }),
    });

    expect(response.status).toBe(201);
    expect(strapiPost).toHaveBeenCalledWith('/vinculos', expect.objectContaining({
      solicitante: 'perfil-doc-1',
      destinatario: 'perfil-doc-2',
      connectionType: 'student-mentor',
      status: 'pendente',
    }));
    expect(publishWithOutboxMock).toHaveBeenCalledWith('vinculo.solicitado', expect.objectContaining({
      vinculoId: 'vinculo-doc-10',
      solicitanteId: '1',
      destinatarioId: 'user-2',
    }));
  });

  it('só permite ao destinatário resolver o vínculo', async () => {
    vi.mocked(strapiGet).mockResolvedValueOnce(listResponse([{
      id: 10,
      documentId: 'vinculo-doc-10',
      solicitante: destinatario,
      destinatario: solicitante,
      status: 'pendente',
      criadoEm: '2026-01-01T00:00:00.000Z',
    }]));
    vi.mocked(strapiPut).mockResolvedValueOnce(singleResponse({
      id: 10,
      documentId: 'vinculo-doc-10',
      solicitante: destinatario,
      destinatario: solicitante,
      status: 'aprovado',
      criadoEm: '2026-01-01T00:00:00.000Z',
    }));

    const response = await app.request('/vinculos/vinculo-doc-10/resolver', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'aprovado' }),
    });

    expect(response.status).toBe(200);
    expect(strapiPut).toHaveBeenCalledWith('/vinculos/vinculo-doc-10', expect.objectContaining({ status: 'aprovado' }));
  });
});
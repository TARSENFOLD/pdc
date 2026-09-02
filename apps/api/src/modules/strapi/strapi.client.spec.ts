import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  normalizeStrapiResponse,
  strapiDelete,
  strapiDeleteRaw,
  strapiGet,
  strapiPost,
  strapiPut,
} from './strapi.client.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('normalizeStrapiResponse', () => {
  it('preserva documentId ao normalizar entidades com attributes', () => {
    const response = normalizeStrapiResponse({
      data: [{
        id: 12,
        documentId: 'doc-modulo-12',
        attributes: { titulo: 'Módulo 1', ordem: 1 },
      }],
      meta: {},
    });

    expect(response.data[0]).toEqual({
      id: 12,
      documentId: 'doc-modulo-12',
      titulo: 'Módulo 1',
      ordem: 1,
    });
  });

  it('normaliza objeto único sem permitir override de campos de identidade', () => {
    const response = normalizeStrapiResponse({
      data: {
        id: 5,
        documentId: 'doc-curso-5',
        attributes: { id: 999, documentId: 'attr-doc', titulo: 'Curso A' },
      },
      meta: {},
    });

    expect(response.data).toEqual({
      id: 5,
      documentId: 'doc-curso-5',
      titulo: 'Curso A',
    });
  });

  it('preserva entidades planas sem attributes', () => {
    const response = normalizeStrapiResponse({
      data: [{ id: 1, nome: 'Flat' }],
      meta: {},
    });

    expect(response.data[0]).toEqual({ id: 1, nome: 'Flat' });
  });

  it('não materializa documentId indefinido ao normalizar attributes', () => {
    const response = normalizeStrapiResponse({
      data: [{ id: 3, attributes: { nome: 'Sem documentId' } }],
      meta: {},
    });

    const normalized = response.data[0];
    expect(normalized).toEqual({ id: 3, nome: 'Sem documentId' });
    if (!normalized) throw new Error('Entidade normalizada ausente');
    expect(Object.hasOwn(normalized, 'documentId')).toBe(false);
  });

  it('aceita DELETE 204 sem corpo no wrapper normalizado', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(strapiDelete('/itens/1')).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('aceita DELETE 204 sem corpo no wrapper raw', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(strapiDeleteRaw('/itens/1')).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['GET', () => strapiGet('/itens')],
    ['POST', () => strapiPost('/itens', {})],
    ['PUT', () => strapiPut('/itens/1', {})],
    ['DELETE', () => strapiDelete('/itens/1')],
  ])('preserva o corpo estruturado em erros %s', async (_method, request) => {
    const body = { error: { message: 'This attribute must be unique' } };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    })));

    await expect(request()).rejects.toMatchObject({ status: 409, body });
  });

  it('preserva status e omite body quando a resposta de erro não é JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<h1>Bad gateway</h1>', {
      status: 502,
      headers: { 'Content-Type': 'text/html' },
    })));

    await expect(strapiGet('/itens')).rejects.toMatchObject({
      status: 502,
      body: undefined,
    });
  });
});

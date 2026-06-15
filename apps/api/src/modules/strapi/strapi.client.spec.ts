import { describe, expect, it } from 'vitest';
import { normalizeStrapiResponse } from './strapi.client.js';

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
});

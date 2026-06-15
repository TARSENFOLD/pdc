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
});

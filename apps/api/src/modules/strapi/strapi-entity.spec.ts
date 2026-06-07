import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StrapiListResponse } from '@pdc/shared';
import { strapiGet } from './strapi.client.js';
import { findStrapiEntity, persistedEntityId } from './strapi-entity.js';

vi.mock('./strapi.client.js', () => ({
  strapiGet: vi.fn(),
}));

describe('Strapi entity identity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses documentId for Strapi v5 persistence', () => {
    expect(persistedEntityId({ id: 12, documentId: 'entity-doc-12' })).toBe('entity-doc-12');
  });

  it('keeps legacy id compatibility when documentId is absent', () => {
    expect(persistedEntityId({ id: 12 })).toBe('12');
  });

  it('resolves either public id or documentId with ownership filters', async () => {
    const response: StrapiListResponse<{ id: number; documentId?: string }> = {
      data: [{ id: 12, documentId: 'entity-doc-12' }],
      meta: { pagination: { page: 1, pageSize: 1, pageCount: 1, total: 1 } },
    };
    vi.mocked(strapiGet).mockResolvedValue(response);

    const entity = await findStrapiEntity<{ id: number; documentId?: string }>('notificacoes', '12', {
      'filters[userId][$eq]': 'user-1',
    });

    expect(entity?.documentId).toBe('entity-doc-12');
    expect(strapiGet).toHaveBeenCalledWith('/notificacoes', {
      'filters[userId][$eq]': 'user-1',
      'filters[$or][0][documentId][$eq]': '12',
      'filters[$or][1][id][$eq]': '12',
      'pagination[pageSize]': '1',
    });
  });
});

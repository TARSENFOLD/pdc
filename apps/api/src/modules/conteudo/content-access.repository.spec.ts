import { describe, expect, it, vi } from 'vitest';

import {
  appendContentEntityIdentityFilters,
  contentRelationIdentityFilters,
  loadContentVersions,
} from './content-access.repository.js';

describe('content access repository', () => {
  it('loads draft and published versions without swallowing dependency failures', async () => {
    const load = vi.fn()
      .mockResolvedValueOnce({ id: 'draft' })
      .mockResolvedValueOnce({ id: 'published' });

    await expect(loadContentVersions(load)).resolves.toEqual({
      current: { id: 'draft' },
      published: { id: 'published' },
    });

    const unavailable = vi.fn().mockRejectedValue(new Error('Strapi unavailable'));
    await expect(loadContentVersions(unavailable)).rejects.toThrow('Strapi unavailable');
  });

  it('never sends documentIds to integer id filters', () => {
    const params: Record<string, string | string[]> = {};

    appendContentEntityIdentityFilters(params, ['document-id', '42']);

    expect(params).toEqual({
      'filters[$or][0][documentId][$eq]': 'document-id',
      'filters[$or][1][documentId][$eq]': '42',
      'filters[$or][2][id][$eq]': '42',
    });
    expect(contentRelationIdentityFilters('curso', 'course-document-id')).toEqual({
      'filters[$or][0][curso][documentId][$eq]': 'course-document-id',
    });
  });
});

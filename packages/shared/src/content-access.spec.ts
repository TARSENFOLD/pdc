import { describe, expect, it } from 'vitest';

import {
  ContentAccessErrorResponseSchema,
  ContentAccessPolicySchema,
  PreMigrationContentStateSchema,
  StrapiPublicationStatusSchema,
} from './content-access.js';

describe('content access contracts', () => {
  it('accepts only the pre-migration editorial states required by COR-0002', () => {
    expect(PreMigrationContentStateSchema.parse('archived')).toBe('archived');
    expect(PreMigrationContentStateSchema.safeParse('approved').success).toBe(true);
    expect(PreMigrationContentStateSchema.safeParse('missing').success).toBe(false);
  });

  it('keeps publication status and participation policy closed', () => {
    expect(StrapiPublicationStatusSchema.safeParse('published').success).toBe(true);
    expect(StrapiPublicationStatusSchema.safeParse('unpublished').success).toBe(false);
    expect(ContentAccessPolicySchema.safeParse('open').success).toBe(true);
    expect(ContentAccessPolicySchema.safeParse('public').success).toBe(false);
  });

  it('rejects non-canonical access error responses', () => {
    expect(ContentAccessErrorResponseSchema.safeParse({
      error: 'Conteúdo não encontrado.',
      code: 'CONTENT_NOT_FOUND',
    }).success).toBe(true);
    expect(ContentAccessErrorResponseSchema.safeParse({
      error: '',
      code: 'CONTENT_NOT_FOUND',
    }).success).toBe(false);
    expect(ContentAccessErrorResponseSchema.safeParse({
      error: 'Falha',
      code: 'UNKNOWN_CODE',
    }).success).toBe(false);
  });
});

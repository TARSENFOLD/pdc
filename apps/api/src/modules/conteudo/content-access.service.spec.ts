import { describe, expect, it } from 'vitest';
import type { PreMigrationContentState, Role } from '@pdc/shared';

import {
  canEnrollOrParticipate,
  canPreviewContent,
  canReadPublicContent,
  canReadResolvedPublicContent,
  decideLearnerAccess,
  parseContentState,
} from './content-access.service.js';

const actor = { id: 'user-1', role: 'mentor' as const };

describe('content access service', () => {
  it.each([
    ['published', 'approved', true],
    ['draft', 'approved', false],
    ['published', 'draft', false],
    ['published', 'review', false],
    ['published', 'hidden', false],
    ['published', 'archived', false],
    [undefined, 'approved', false],
    ['published', undefined, false],
  ] satisfies Array<[
    'draft' | 'published' | undefined,
    PreMigrationContentState | undefined,
    boolean,
  ]>)('public read status=%s state=%s => %s', (strapiStatus, estado, expected) => {
    expect(canReadPublicContent({ strapiStatus, estado })).toBe(expected);
  });

  it('rejects an invalid or absent external editorial state', () => {
    expect(parseContentState('approved')).toBe('approved');
    expect(parseContentState('invalid')).toBeUndefined();
    expect(parseContentState(undefined)).toBeUndefined();
  });

  it.each([
    [{ id: 'author-1', role: 'mentor' as const }, 'author-1', [], true],
    [{ id: 'other-1', role: 'mentor' as const }, 'author-1', [], false],
    [{ id: 'reviewer-1', role: 'comite_cientifico' as const }, 'author-1', ['comite_cientifico'], true],
    [{ id: 'reviewer-1', role: 'moderador' as const }, 'author-1', ['comite_cientifico'], false],
    [{ id: 'admin-1', role: 'super_admin' as const }, 'author-1', [], true],
  ] satisfies Array<[
    { id: string; role: Role },
    string,
    Role[],
    boolean,
  ]>)('evaluates preview authority for %o', (previewActor, authorId, reviewerRoles, expected) => {
    expect(canPreviewContent({ actor: previewActor, authorId, reviewerRoles })).toBe(expected);
  });

  it('requires publication, approval and a permissive access policy for participation', () => {
    expect(canEnrollOrParticipate({
      strapiStatus: 'published',
      estado: 'approved',
      accessPolicy: 'open',
    })).toBe(true);
    expect(canEnrollOrParticipate({
      strapiStatus: 'published',
      estado: 'approved',
      accessPolicy: 'restricted',
    })).toBe(false);
    expect(canEnrollOrParticipate({
      strapiStatus: 'draft',
      estado: 'approved',
      accessPolicy: 'granted',
    })).toBe(false);
  });

  it('mantém a versão publicada approved durante novo draft/review, mas hidden/archived prevalecem', () => {
    expect(canReadResolvedPublicContent({
      currentState: 'review',
      publishedState: 'approved',
      hasPublishedVersion: true,
    })).toBe(true);
    expect(canReadResolvedPublicContent({
      currentState: 'hidden',
      publishedState: 'approved',
      hasPublishedVersion: true,
    })).toBe(false);
    expect(canReadResolvedPublicContent({
      currentState: 'archived',
      publishedState: 'approved',
      hasPublishedVersion: true,
    })).toBe(false);
    expect(canReadResolvedPublicContent({
      currentState: 'approved',
      publishedState: 'approved',
      hasPublishedVersion: false,
    })).toBe(false);
  });

  it('returns PREVIEW_ONLY before learner mutations and 409 for hidden existing relations', () => {
    expect(decideLearnerAccess({
      actor,
      authorId: actor.id,
      reviewerRoles: [],
      currentState: 'draft',
      publishedState: undefined,
      hasPublishedVersion: false,
      relationExists: false,
      accessPolicy: 'open',
    })).toBe('preview_only');

    expect(decideLearnerAccess({
      actor: { id: 'student-1', role: 'estudante' },
      authorId: 'author-1',
      reviewerRoles: [],
      currentState: 'hidden',
      publishedState: 'approved',
      hasPublishedVersion: true,
      relationExists: true,
      accessPolicy: 'open',
    })).toBe('content_not_available');
  });

  it.each(['hidden', 'archived'] as const)(
    'não revela conteúdo %s sem relação existente',
    (currentState) => {
      expect(decideLearnerAccess({
        actor: { id: 'student-1', role: 'estudante' },
        authorId: 'author-1',
        reviewerRoles: [],
        currentState,
        publishedState: 'approved',
        hasPublishedVersion: true,
        relationExists: false,
        accessPolicy: 'open',
      })).toBe('content_not_found');
    },
  );

  it('does not reveal whether an inaccessible content id exists', () => {
    const common = {
      actor: { id: 'student-1', role: 'estudante' as const },
      authorId: 'author-1',
      reviewerRoles: [] as Role[],
      publishedState: undefined,
      hasPublishedVersion: false,
      relationExists: false,
      accessPolicy: 'open' as const,
    };
    expect(decideLearnerAccess({ ...common, currentState: 'draft' })).toBe('content_not_found');
    expect(decideLearnerAccess({ ...common, currentState: undefined })).toBe('content_not_found');
  });
});

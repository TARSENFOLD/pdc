import type {
  ContentAccessErrorResponse,
  ContentAccessPolicy,
  PreMigrationContentState,
  Role,
  StrapiPublicationStatus,
} from '@pdc/shared';
import { PreMigrationContentStateSchema } from '@pdc/shared';

export interface ContentAccessActor {
  id: string;
  role: Role;
}

export interface PublicContentAccessInput {
  strapiStatus: StrapiPublicationStatus | undefined;
  estado: PreMigrationContentState | undefined;
}

export interface PreviewContentAccessInput {
  actor: ContentAccessActor;
  authorId: string | undefined;
  reviewerRoles: readonly Role[];
}

export interface ParticipationContentAccessInput extends PublicContentAccessInput {
  accessPolicy: ContentAccessPolicy;
}

export type LearnerAccessDecision =
  | 'allow'
  | 'content_not_found'
  | 'preview_only'
  | 'content_not_available';

export const CONTENT_ACCESS_ERRORS = {
  content_not_found: {
    error: 'Conteúdo não encontrado.',
    code: 'CONTENT_NOT_FOUND',
  },
  preview_only: {
    error: 'Este conteúdo só está disponível em pré-visualização.',
    code: 'PREVIEW_ONLY',
  },
  content_not_available: {
    error: 'Este conteúdo já não está disponível.',
    code: 'CONTENT_NOT_AVAILABLE',
  },
  dependency_unavailable: {
    error: 'O serviço de conteúdos está temporariamente indisponível.',
    code: 'DEPENDENCY_UNAVAILABLE',
  },
} as const satisfies Record<Exclude<LearnerAccessDecision, 'allow'> | 'dependency_unavailable', ContentAccessErrorResponse>;

export function parseContentState(value: string | undefined): PreMigrationContentState | undefined {
  const parsed = PreMigrationContentStateSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function applyAuthoritativePublicContentFilter(
  params: Record<string, string | string[]>,
): void {
  params.status = 'published';
  params['filters[estado][$eq]'] = 'approved';
}

export function canReadPublicContent({
  strapiStatus,
  estado,
}: PublicContentAccessInput): boolean {
  return strapiStatus === 'published' && estado === 'approved';
}

export function canPreviewContent({
  actor,
  authorId,
  reviewerRoles,
}: PreviewContentAccessInput): boolean {
  return actor.role === 'super_admin'
    || actor.id === authorId
    || reviewerRoles.includes(actor.role);
}

export function canEnrollOrParticipate({
  strapiStatus,
  estado,
  accessPolicy,
}: ParticipationContentAccessInput): boolean {
  return accessPolicy !== 'restricted'
    && canReadPublicContent({ strapiStatus, estado });
}

export function isUnavailableContentState(
  estado: PreMigrationContentState | undefined,
): boolean {
  return estado === 'hidden' || estado === 'archived';
}

export function canReadResolvedPublicContent(input: {
  currentState: PreMigrationContentState | undefined;
  publishedState: PreMigrationContentState | undefined;
  hasPublishedVersion: boolean;
}): boolean {
  return !isUnavailableContentState(input.currentState)
    && canReadPublicContent({
      strapiStatus: input.hasPublishedVersion ? 'published' : undefined,
      estado: input.publishedState,
    });
}

export function decideLearnerAccess(input: {
  actor: ContentAccessActor;
  authorId: string | undefined;
  reviewerRoles: readonly Role[];
  currentState: PreMigrationContentState | undefined;
  publishedState: PreMigrationContentState | undefined;
  hasPublishedVersion: boolean;
  relationExists: boolean;
  accessPolicy: ContentAccessPolicy;
}): LearnerAccessDecision {
  if (isUnavailableContentState(input.currentState)) {
    return input.relationExists
      ? 'content_not_available'
      : 'content_not_found';
  }

  if (canEnrollOrParticipate({
    strapiStatus: input.hasPublishedVersion ? 'published' : undefined,
    estado: input.publishedState,
    accessPolicy: input.accessPolicy,
  })) {
    return 'allow';
  }

  if (canPreviewContent({
    actor: input.actor,
    authorId: input.authorId,
    reviewerRoles: input.reviewerRoles,
  })) {
    return 'preview_only';
  }

  return 'content_not_found';
}

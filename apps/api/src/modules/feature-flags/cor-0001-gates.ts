import type { Context, MiddlewareHandler } from 'hono';
import pino from 'pino';
import type {
  FeatureKey,
  FeatureUnavailableCode,
  FeatureUnavailableResponse,
} from '@pdc/shared';
import type { AuthVariables } from '../auth/auth.middleware.js';
import { featureFlagService } from './feature-flags.service.js';

const log = pino({ name: 'feature-flags:cor-0001' });

type ProtectedGate = MiddlewareHandler<{ Variables: AuthVariables }>;

const UNAVAILABLE_MESSAGES: Record<FeatureUnavailableCode, string> = {
  EXTERNAL_CREATOR_ONBOARDING_TEMPORARILY_DISABLED:
    'O onboarding de criadores externos está temporariamente indisponível.',
  EXTERNAL_CREATOR_ACCESS_TEMPORARILY_DISABLED:
    'O estúdio de criação está temporariamente indisponível para contas externas.',
  CONTENT_SUBMISSION_TEMPORARILY_DISABLED:
    'A submissão de conteúdos está temporariamente indisponível.',
  CERTIFICATES_TEMPORARILY_DISABLED:
    'Os certificados estão temporariamente indisponíveis.',
  EXTERNAL_PROJECT_PUBLICATION_TEMPORARILY_DISABLED:
    'A criação e publicação externa de projectos está temporariamente indisponível.',
};

export function featureUnavailable(
  c: Context,
  code: FeatureUnavailableCode,
): Response {
  const body: FeatureUnavailableResponse = {
    error: UNAVAILABLE_MESSAGES[code],
    code,
  };
  return c.json(body, 503);
}

export async function isFeatureEnabledFailClosed(
  flag: FeatureKey,
): Promise<boolean> {
  try {
    return await featureFlagService.isEnabled(flag);
  } catch (err) {
    log.error({ err, flag }, 'Feature flag unavailable; protected capability remains disabled');
    return false;
  }
}

export async function disabledFeatureResponse(
  c: Context,
  flag: FeatureKey,
  code: FeatureUnavailableCode,
): Promise<Response | null> {
  return await isFeatureEnabledFailClosed(flag)
    ? null
    : featureUnavailable(c, code);
}

export function requireExternalCreatorOnboarding(): MiddlewareHandler {
  return async (c, next) => {
    const unavailable = await disabledFeatureResponse(
      c,
      'external_creator_onboarding_enabled',
      'EXTERNAL_CREATOR_ONBOARDING_TEMPORARILY_DISABLED',
    );
    if (unavailable) return unavailable;
    await next();
  };
}

export function requireInternalQaCreatorAccess(): ProtectedGate {
  return async (c, next) => {
    if (['super_admin', 'moderador', 'comite_cientifico'].includes(c.get('user').role)) {
      await next();
      return;
    }
    const unavailable = await disabledFeatureResponse(
      c,
      'external_creator_onboarding_enabled',
      'EXTERNAL_CREATOR_ACCESS_TEMPORARILY_DISABLED',
    );
    if (unavailable) return unavailable;
    await next();
  };
}

export function requireContentSubmissionEnabled(): ProtectedGate {
  return async (c, next) => {
    const unavailable = await disabledFeatureResponse(
      c,
      'content_submission_enabled',
      'CONTENT_SUBMISSION_TEMPORARILY_DISABLED',
    );
    if (unavailable) return unavailable;
    await next();
  };
}

export function requireCertificatesEnabled(): ProtectedGate {
  return async (c, next) => {
    const unavailable = await disabledFeatureResponse(
      c,
      'certificates_enabled',
      'CERTIFICATES_TEMPORARILY_DISABLED',
    );
    if (unavailable) return unavailable;
    await next();
  };
}

export function requireExternalProjectPublication(): ProtectedGate {
  return async (c, next) => {
    if (c.get('user').role === 'super_admin') {
      await next();
      return;
    }
    const unavailable = await disabledFeatureResponse(
      c,
      'external_project_publication_enabled',
      'EXTERNAL_PROJECT_PUBLICATION_TEMPORARILY_DISABLED',
    );
    if (unavailable) return unavailable;
    await next();
  };
}

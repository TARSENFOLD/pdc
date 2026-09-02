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
  instituicaoId?: number,
): Promise<Response | null> {
  let enabled = false;
  try {
    enabled = instituicaoId === undefined
      ? await featureFlagService.isEnabled(flag)
      : await featureFlagService.isEnabled(flag, instituicaoId);
  } catch (err) {
    log.error(
      { err, flag, instituicaoId },
      'Feature flag unavailable; protected capability remains disabled',
    );
  }

  return enabled
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
    const user = c.get('user');
    if (['super_admin', 'moderador', 'comite_cientifico'].includes(user.role)) {
      await next();
      return;
    }
    const unavailable = await disabledFeatureResponse(
      c,
      'external_creator_onboarding_enabled',
      'EXTERNAL_CREATOR_ACCESS_TEMPORARILY_DISABLED',
      user.instituicaoId,
    );
    if (unavailable) return unavailable;
    await next();
  };
}

export function requireContentSubmissionEnabled(): ProtectedGate {
  return async (c, next) => {
    const user = c.get('user');
    const unavailable = await disabledFeatureResponse(
      c,
      'content_submission_enabled',
      'CONTENT_SUBMISSION_TEMPORARILY_DISABLED',
      user.instituicaoId,
    );
    if (unavailable) return unavailable;
    await next();
  };
}

export function requireCertificatesEnabled(): ProtectedGate {
  return async (c, next) => {
    const user = c.get('user');
    const unavailable = await disabledFeatureResponse(
      c,
      'certificates_enabled',
      'CERTIFICATES_TEMPORARILY_DISABLED',
      user.instituicaoId,
    );
    if (unavailable) return unavailable;
    await next();
  };
}

export function requireExternalProjectPublication(): ProtectedGate {
  return async (c, next) => {
    const user = c.get('user');
    if (user.role === 'super_admin') {
      await next();
      return;
    }
    const unavailable = await disabledFeatureResponse(
      c,
      'external_project_publication_enabled',
      'EXTERNAL_PROJECT_PUBLICATION_TEMPORARILY_DISABLED',
      user.instituicaoId,
    );
    if (unavailable) return unavailable;
    await next();
  };
}

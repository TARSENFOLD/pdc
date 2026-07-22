import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import pino from 'pino';
import { authService } from '../modules/auth/auth.service.js';
import { verifyAccessJwt } from '../modules/auth/auth.middleware.js';
import { ACCESS_TOKEN_COOKIE } from '../modules/auth/auth.constants.js';
import { featureFlagService } from '../modules/feature-flags/feature-flags.service.js';
import { signTelemetryToken } from '../modules/auth/telemetry-token.js';
import { Features, type BootstrapResponse } from '@pdc/shared';

const log = pino({ name: 'routes:bootstrap' });

export const bootstrapRoutes = new Hono();

bootstrapRoutes.get('/', async (c) => {
  // 1. Soft Session Extraction (Tolerante a utilizadores não autenticados)
  const token = getCookie(c, ACCESS_TOKEN_COOKIE);
  let userPayload: BootstrapResponse['session']['user'] = null;
  let sessionStatus: BootstrapResponse['session']['status'] = token ? 'unknown' : 'anonymous';
  let telemetryToken: string | undefined = undefined;
  let instituicaoId: number | undefined = undefined;

  if (token) {
    let parsedPayload: Awaited<ReturnType<typeof verifyAccessJwt>>;
    let sessionValidationUnavailable = false;
    try {
      parsedPayload = await verifyAccessJwt(token);
    } catch (err) {
      log.error({ err }, 'Session store unavailable during bootstrap');
      parsedPayload = null;
      sessionValidationUnavailable = true;
    }

    if (parsedPayload) {
      try {
        const dbUser = await authService.getUserById(parsedPayload.sub);

        // Injectamos a Role real e Perfil (que está guardado no Strapi)
        userPayload = {
          id: dbUser.id,
          email: dbUser.email,
          role: dbUser.role,
          perfilId: dbUser.perfilId || undefined,
        };
        sessionStatus = 'authenticated';

        // Instituição ID para extração de Flags override se existir no token
        instituicaoId = parsedPayload.instituicaoId;
      } catch (err) {
        log.warn({ err, userId: parsedPayload.sub }, 'Bootstrap session enrichment unavailable');
      }
    } else {
      sessionStatus = sessionValidationUnavailable ? 'unknown' : 'anonymous';
    }

    // 2. Emissão Soberana do Telemetry Token assinado por RS256 (W1-T2)
    if (sessionStatus === 'authenticated' && userPayload?.perfilId) {
      try {
        telemetryToken = await signTelemetryToken(userPayload.id, userPayload.perfilId);
      } catch (err) {
        log.warn({ err, userId: userPayload.id }, 'Telemetry token unavailable during bootstrap');
      }
    } else if (sessionStatus === 'authenticated' && userPayload) {
      log.warn(
        { userId: userPayload.id },
        'Perfil ausente numa sessão autenticada; token de telemetria não emitido',
      );
    }
  }

  // 3. Resolução Híbrida de Capabilities (Feature Registry vs Strapi Overrides)
  let dynamicFlags: Record<string, boolean> = {};
  try {
    dynamicFlags = await featureFlagService.getEffectiveFlags(instituicaoId);
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.warn(
      { err, instituicaoId },
      'Feature flag overrides unavailable; falling back to static registry defaults',
    );
  }
  const cleanFeatures: Record<string, boolean> = {};

  // O "Registry" dita os contratos: apenas os conhecidos são passados, e HIDDEN é expurgado
  for (const [key, status] of Object.entries(Features)) {
    if (status === 'HIDDEN') continue;

    // Se houver um override do Strapi, este ganha a corrida
    if (key in dynamicFlags) {
      cleanFeatures[key] = dynamicFlags[key] ?? false;
    } else {
      // Caso contrário, regras canónicas aplicam-se (STABLE = true, outros = false)
      cleanFeatures[key] = status === 'STABLE';
    }
  }

  // 4. Composição da Resposta Global (Schema-compliant)
  const session: BootstrapResponse['session'] = sessionStatus === 'authenticated' && userPayload
    ? { status: 'authenticated', isAuthenticated: true, user: userPayload }
    : { status: sessionStatus === 'authenticated' ? 'unknown' : sessionStatus, isAuthenticated: false, user: null };
  const response: BootstrapResponse = {
    session,
    capabilities: {
      features: cleanFeatures,
      roles: ['estudante', 'mentor', 'instituicao', 'moderador', 'comite_cientifico', 'super_admin', 'patrocinador'],
    },
    security: {
      telemetryToken,
    },
    ux: {
      theme: 'claro', // Extensível futuro para buscar das preferências do Strapi
    },
  };

  return c.json(response);
});

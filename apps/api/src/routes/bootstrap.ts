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
  let telemetryToken: string | undefined = undefined;
  let instituicaoId: number | undefined = undefined;

  if (token) {
    try {
      const parsedPayload = await verifyAccessJwt(token);
      if (!parsedPayload) throw new Error('Invalid bootstrap JWT payload');
      const dbUser = await authService.getUserById(parsedPayload.sub);

      // Injectamos a Role real e Perfil (que está guardado no Strapi)
      userPayload = {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
        perfilId: dbUser.perfilId || undefined,
      };

      // Instituição ID para extração de Flags override se existir no token
      instituicaoId = parsedPayload.instituicaoId;

      // 2. Emissão Soberana do Telemetry Token assinado por RS256 (W1-T2)
      if (userPayload.perfilId) {
        telemetryToken = await signTelemetryToken(userPayload.id, userPayload.perfilId);
      } else {
        log.error(
          { userId: userPayload.id },
          'Perfil ausente numa sessão autenticada; token de telemetria não emitido',
        );
      }
    } catch {
      // Ignoramos falhas de assinatura aqui, tratamo-los como utilizador não autenticado
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
  const response: BootstrapResponse = {
    session: {
      isAuthenticated: userPayload !== null,
      user: userPayload,
    },
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

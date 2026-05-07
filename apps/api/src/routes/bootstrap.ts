import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { jwtVerify } from 'jose';
import pino from 'pino';
import { env } from '../lib/env.js';
import { authService } from '../modules/auth/auth.service.js';
import { JwtUserPayloadSchema } from '../modules/auth/auth.middleware.js';
import { featureFlagService } from '../modules/feature-flags/feature-flags.service.js';
import { signTelemetryToken } from '../modules/auth/telemetry-token.js';
import { Features, type BootstrapResponse } from '@pdc/shared';
// Role import removed as it is unused

const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET);
const log = pino({ name: 'routes:bootstrap' });

export const bootstrapRoutes = new Hono();

bootstrapRoutes.get('/', async (c) => {
  // 1. Soft Session Extraction (Tolerante a utilizadores não autenticados)
  const token = getCookie(c, 'access_token');
  let userPayload: BootstrapResponse['session']['user'] = null;
  let telemetryToken: string | undefined = undefined;
  let instituicaoId: number | undefined = undefined;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      const payloadResult = JwtUserPayloadSchema.safeParse(payload);
      if (!payloadResult.success) {
        throw new Error('Invalid bootstrap JWT payload');
      }
      const parsedPayload = payloadResult.data;
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
      telemetryToken = await signTelemetryToken(
        userPayload.id,
        userPayload.perfilId || 'unknown'
      );
    } catch {
      // Ignoramos falhas de assinatura aqui, tratamo-los como utilizador não autenticado
    }
  }

  // 3. Resolução Híbrida de Capabilities (Feature Registry vs Strapi Overrides)
  let dynamicFlags: Record<string, boolean> = {};
  try {
    dynamicFlags = await featureFlagService.getEffectiveFlags(instituicaoId);
  } catch (error: unknown) {
    log.warn(
      { err: error, instituicaoId },
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

import { createHmac } from 'node:crypto';
import type { Core } from '@strapi/strapi';
import { ONBOARDING_VIDEO_ROLES, ONBOARDING_VIDEO_TITLES } from './shared/onboarding-video-constants';

const INITIAL_FLAGS = [
  { domain: 'DISCUSSIONS_ENABLED', description: 'Habilitar módulo de discussões' },
  { domain: 'REPUTATION_VISIBLE', description: 'Mostrar pontuação de reputação nos perfis' },
  { domain: 'PROFILE_V2_PUBLIC', description: 'Ativar novo layout de perfil público (v2)' },
  { domain: 'AUTO_ACHIEVEMENTS', description: 'Desbloquear conquistas automaticamente' },
] as const;

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    const featureFlagService = strapi.service('api::feature-flag.feature-flag');

    for (const flag of INITIAL_FLAGS) {
      const existing = await strapi.documents('api::feature-flag.feature-flag').findMany({
        filters: { domain: flag.domain },
        limit: 1,
      });

      if (existing.length === 0) {
        await strapi.documents('api::feature-flag.feature-flag').create({
          data: {
            domain: flag.domain,
            enabled: false,
            description: flag.description,
            overrides: [],
          },
        });
        strapi.log.info(`[seed] Feature flag "${flag.domain}" created (enabled: false)`);
      }
    }

    try {
      await seedOnboardingVideos(strapi);
    } catch (err) {
      strapi.log.error('[seed] onboarding-videos failed (non-fatal)', { err });
    }

    if (process.env['NODE_ENV'] === 'test') {
      await seedTestApiToken(strapi);
    }
  },
};

async function seedOnboardingVideos(strapi: Core.Strapi) {
  for (const role of ONBOARDING_VIDEO_ROLES) {
    try {
      const existing = await strapi.documents('api::onboarding-video.onboarding-video').findMany({
        filters: { role },
        limit: 1,
      });

      if (existing.length > 0) {
        continue;
      }

      const titles = ONBOARDING_VIDEO_TITLES[role];
      // FIXME: substituir 'about:blank' por URL real de R2 quando disponível
      await strapi.documents('api::onboarding-video.onboarding-video').create({
        data: {
          role,
          videoUrl: 'about:blank',
          embedType: 'r2',
          duracaoSegundos: 0,
          thumbnailUrl: null,
          tituloPt: titles.pt,
          tituloEn: titles.en,
        },
      });
      strapi.log.info('[seed] OnboardingVideo created (placeholder)', { role });
    } catch (err: unknown) {
      strapi.log.error(
        '[seed] OnboardingVideo seed failed for role — non-fatal, continuing boot',
        { role, err: err instanceof Error ? err.message : String(err) },
      );
    }
  }
}

async function seedTestApiToken(strapi: Core.Strapi) {
  const tokenValue = process.env['STRAPI_API_TOKEN'] ?? 'test-strapi-token';
  const salt = process.env['API_TOKEN_SALT'] ?? 'testTokenSalt';
  const hashedKey = createHmac('sha512', salt).update(tokenValue).digest('hex');

  const existing = await strapi.db.query('admin::api-token').findOne({
    where: { name: 'ci-test-token' },
  });

  if (!existing) {
    await strapi.db.query('admin::api-token').create({
      data: {
        name: 'ci-test-token',
        description: 'Auto-created for CI/E2E testing',
        type: 'full-access',
        accessKey: hashedKey,
        lifespan: null,
      },
    });
    strapi.log.info('[bootstrap] CI test API token created (test-strapi-token)');
  }
}

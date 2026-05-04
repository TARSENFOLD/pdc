import { createHmac } from 'node:crypto';
import type { Core } from '@strapi/strapi';

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

    if (process.env['NODE_ENV'] === 'test') {
      await seedTestApiToken(strapi);
    }
  },
};

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

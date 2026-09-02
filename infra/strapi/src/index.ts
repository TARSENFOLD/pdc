import { createHmac } from 'node:crypto';
import type { Core } from '@strapi/strapi';
import { ONBOARDING_VIDEO_ROLES, ONBOARDING_VIDEO_TITLES } from './shared/onboarding-video-constants';
import { normalizedParticipantsKey } from './api/conversa/content-types/conversa/lifecycles';

const INITIAL_FLAGS = [
  { domain: 'DISCUSSIONS_ENABLED', description: 'Habilitar módulo de discussões' },
  { domain: 'REPUTATION_VISIBLE', description: 'Mostrar pontuação de reputação nos perfis' },
  { domain: 'PROFILE_V2_PUBLIC', description: 'Ativar novo layout de perfil público (v2)' },
  { domain: 'AUTO_ACHIEVEMENTS', description: 'Desbloquear conquistas automaticamente' },
  {
    domain: 'APPROVAL_ENFORCEMENT_ENABLED',
    description: 'Exigir aprovação do perfil antes da criação de conteúdos',
    enabled: true,
  },
  { domain: 'external_creator_onboarding_enabled', description: 'Permitir onboarding de criadores externos' },
  { domain: 'content_submission_enabled', description: 'Permitir submissão de conteúdos para revisão' },
  { domain: 'certificates_enabled', description: 'Disponibilizar certificados' },
  { domain: 'institution_advanced_analytics_enabled', description: 'Disponibilizar analítica institucional avançada' },
  { domain: 'vwx_creator_enabled', description: 'Permitir criação de experiências VWX' },
  { domain: 'vwx_catalog_enabled', description: 'Expor experiências VWX no catálogo público' },
  { domain: 'vwx_partner_onboarding_enabled', description: 'Permitir onboarding de parceiros VWX' },
  { domain: 'vwx_opportunity_pathway_enabled', description: 'Ativar Opportunity Pathway VWX' },
  { domain: 'external_project_publication_enabled', description: 'Permitir criação e publicação externa de projectos' },
  { domain: 'mobile_store_release_enabled', description: 'Permitir promoção de builds para lojas móveis' },
  { domain: 'mobile_paid_enrollment_enabled', description: 'Permitir matrícula paga no cliente móvel' },
] as const;

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    registerConversaLifecycles(strapi);

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
            enabled: 'enabled' in flag ? flag.enabled : false,
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

function registerConversaLifecycles(strapi: Core.Strapi) {
  strapi.db.lifecycles.subscribe({
    models: ['api::conversa.conversa'],
    async beforeCreate(event) {
      const data = event.params.data as Record<string, unknown>;
      data.participantsKey = normalizedParticipantsKey(data);
    },
    async beforeUpdate(event) {
      const data = event.params.data as Record<string, unknown>;
      const where = event.params.where as { id?: string | number };
      const id = where.id;

      if (!id) {
        data.participantsKey = normalizedParticipantsKey(data);
        return;
      }

      const current = await strapi.db.query('api::conversa.conversa').findOne({
        where: { id },
        populate: ['participant1', 'participant2'],
      }) as Record<string, unknown> | null;
      if (!current) {
        throw new Error(`Conversa ${String(id)} não encontrada durante beforeUpdate`);
      }
      const merged = { ...current, ...data };
      data.participantsKey = normalizedParticipantsKey(merged);
    },
  });
}

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

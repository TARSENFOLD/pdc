import { z } from 'zod';

export const FeatureStatusSchema = z.enum([
  'STABLE',    // Funcionalidade base, sempre ON por omissão, raramente sujeita a flag
  'BETA',      // Funcionalidade em teste, default OFF, pode ser ligada via Strapi
  'ALPHA',     // Funcionalidade experimental, default OFF, uso restrito
  'ROLLOUT',   // Em lançamento gradual (ex: 50% dos users)
  'HIDDEN',    // Funcionalidade arquivada ou secreta, NUNCA enviada no /bootstrap (hard OFF)
]);

export type FeatureStatus = z.infer<typeof FeatureStatusSchema>;

export const FeatureKeys = [
  'DISCUSSIONS_ENABLED',
  'PROFILE_V2_PUBLIC',
  'REPUTATION_VISIBLE',
  'AUTO_ACHIEVEMENTS',
  'TINA_GLOBAL_ASSISTANT',
  'SIM_TIPO_2_PUBLISH_ENABLED',
  'SIM_TIPO_3_PUBLISH_ENABLED',
  'SIM_TIPO_3',
  'MENSAGENS_INBOX',
  'APPROVAL_ENFORCEMENT_ENABLED',
  'OAUTH_ONBOARDING_REQUIRED',
  'HUB_LEARN',
  'HUB_EXPLORE',
  'HUB_FUTURE',
  'HUB_COMMUNITY',
  'HUB_MENTOR',
  'HUB_INSTITUTION',
  'external_creator_onboarding_enabled',
  'content_submission_enabled',
  'certificates_enabled',
  'institution_advanced_analytics_enabled',
  'vwx_creator_enabled',
  'vwx_catalog_enabled',
  'vwx_partner_onboarding_enabled',
  'vwx_opportunity_pathway_enabled',
  'external_project_publication_enabled',
  'mobile_store_release_enabled',
  'mobile_paid_enrollment_enabled',
] as const;

export const FeatureKeySchema = z.enum(FeatureKeys);
export type FeatureKey = z.infer<typeof FeatureKeySchema>;

export const FeatureRegistrySchema = z.record(FeatureKeySchema, FeatureStatusSchema);
export const EffectiveFeatureFlagsSchema = z.record(FeatureKeySchema, z.boolean());

export const FeatureUnavailableCodeSchema = z.enum([
  'EXTERNAL_CREATOR_ONBOARDING_TEMPORARILY_DISABLED',
  'EXTERNAL_CREATOR_ACCESS_TEMPORARILY_DISABLED',
  'CONTENT_SUBMISSION_TEMPORARILY_DISABLED',
  'CERTIFICATES_TEMPORARILY_DISABLED',
  'EXTERNAL_PROJECT_PUBLICATION_TEMPORARILY_DISABLED',
]);
export type FeatureUnavailableCode = z.infer<typeof FeatureUnavailableCodeSchema>;

export const FeatureUnavailableResponseSchema = z.object({
  error: z.string().min(1),
  code: FeatureUnavailableCodeSchema,
});
export type FeatureUnavailableResponse = z.infer<typeof FeatureUnavailableResponseSchema>;

// Registo Estático Híbrido: Define O QUE EXISTE. 
// O Strapi apenas controla o estado ON/OFF em runtime.
export const Features = {
  'DISCUSSIONS_ENABLED': 'STABLE',
  // PROD-A-T06: preservado como STABLE por 30 dias para audit trail; remover em PROD-E.
  'PROFILE_V2_PUBLIC': 'STABLE',
  'REPUTATION_VISIBLE': 'BETA',
  'AUTO_ACHIEVEMENTS': 'BETA',
  'TINA_GLOBAL_ASSISTANT': 'BETA',
  'SIM_TIPO_2_PUBLISH_ENABLED': 'STABLE',
  'SIM_TIPO_3_PUBLISH_ENABLED': 'STABLE',
  'SIM_TIPO_3': 'ALPHA',
  'MENSAGENS_INBOX': 'HIDDEN', // Fachada, não expor no bootstrap
  'APPROVAL_ENFORCEMENT_ENABLED': 'BETA',
  'OAUTH_ONBOARDING_REQUIRED': 'STABLE',
  
  // Wave 4 - Elite Hubs (Sovereign Infrastructure)
  'HUB_LEARN': 'STABLE',
  'HUB_EXPLORE': 'STABLE',
  'HUB_FUTURE': 'STABLE',
  'HUB_COMMUNITY': 'STABLE',
  'HUB_MENTOR': 'STABLE',
  'HUB_INSTITUTION': 'STABLE',

  // COR-0001 — contenção externa. ROLLOUT é false por omissão.
  'external_creator_onboarding_enabled': 'ROLLOUT',
  'content_submission_enabled': 'ROLLOUT',
  'certificates_enabled': 'ROLLOUT',
  'institution_advanced_analytics_enabled': 'ROLLOUT',
  'vwx_creator_enabled': 'ROLLOUT',
  'vwx_catalog_enabled': 'ROLLOUT',
  'vwx_partner_onboarding_enabled': 'ROLLOUT',
  'vwx_opportunity_pathway_enabled': 'ROLLOUT',
  'external_project_publication_enabled': 'ROLLOUT',
  'mobile_store_release_enabled': 'ROLLOUT',
  'mobile_paid_enrollment_enabled': 'ROLLOUT',
} as const satisfies Record<FeatureKey, FeatureStatus>;

export function isFeatureKey(value: string): value is FeatureKey {
  return FeatureKeySchema.safeParse(value).success;
}

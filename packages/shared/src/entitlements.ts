import { z } from 'zod';

export const FeatureFlagSchema = z.enum([
  'simulacoes',
  'mentoria',
  'analytics',
  'export',
  'api-access',
  'relatorios-avancados',
  'programas',
  'projetos',
  'lti',
  'custom-branding',
]);

export type FeatureFlag = z.infer<typeof FeatureFlagSchema>;

export const QuotaPeriodSchema = z.enum(['day', 'month', 'unlimited']);

export const QuotaDefinitionSchema = z.object({
  feature: FeatureFlagSchema,
  limit: z.number().int().nonnegative(),
  period: QuotaPeriodSchema,
});

export type QuotaDefinition = z.infer<typeof QuotaDefinitionSchema>;

export const EntitlementTierSchema = z.enum(['free', 'basic', 'premium', 'enterprise']);
export type EntitlementTier = z.infer<typeof EntitlementTierSchema>;

export const SubscriptionEntitlementsSchema = z.object({
  tier: EntitlementTierSchema.default('free'),
  features: z.array(FeatureFlagSchema).default([]),
  quotas: z.array(QuotaDefinitionSchema).default([]),
});

export type SubscriptionEntitlements = z.infer<typeof SubscriptionEntitlementsSchema>;

export const DEFAULT_ENTITLEMENTS: SubscriptionEntitlements = {
  tier: 'free',
  features: [],
  quotas: [],
};

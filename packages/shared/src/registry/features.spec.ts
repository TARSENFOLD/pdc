import { describe, expect, it } from 'vitest';
import {
  EffectiveFeatureFlagsSchema,
  FeatureKeySchema,
  Features,
  isFeatureKey,
} from './features.js';

const COR_0001_FLAGS = [
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

describe('COR-0001 feature flag registry', () => {
  it.each(COR_0001_FLAGS)('regista %s com default desligado', (flag) => {
    expect(FeatureKeySchema.parse(flag)).toBe(flag);
    expect(Features[flag]).toBe('ROLLOUT');
    expect(isFeatureKey(flag)).toBe(true);
  });

  it('rejeita flags fora do contrato canónico', () => {
    expect(isFeatureKey('vwx_inferida_pelo_titulo')).toBe(false);
    expect(() => EffectiveFeatureFlagsSchema.parse({
      vwx_inferida_pelo_titulo: true,
    })).toThrow();
  });
});

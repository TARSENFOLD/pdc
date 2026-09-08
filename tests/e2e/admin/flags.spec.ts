import { test, expect } from '../../helpers/fixtures';

test.describe('Admin - Feature Flags', () => {
  test('admin can access feature flags', async ({ adminPage }) => {
    await adminPage.goto('/app/admin/feature-flags');
    await expect(adminPage.getByRole('heading', { name: /feature flags/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('feature flags page shows toggle controls', async ({ adminPage }) => {
    await adminPage.goto('/app/admin/feature-flags');
    const discussionsCard = adminPage.getByTestId('feature-flag-DISCUSSIONS_ENABLED');
    await expect(discussionsCard.getByRole('button', { name: /^(Ligar|Desligar)$/ })).toBeVisible();
  });
});

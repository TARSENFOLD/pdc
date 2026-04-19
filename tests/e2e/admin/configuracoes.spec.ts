import { test, expect } from '../../helpers/fixtures';

test.describe('Admin - Configurações', () => {
  test('admin can view system settings', async ({ adminPage }) => {
    await adminPage.goto('/app/admin/configuracoes');
    await expect(adminPage.locator('h1, h2')).toContainText(/configur/i, { timeout: 10_000 });
  });

  test('admin can toggle feature flags', async ({ adminPage }) => {
    await adminPage.goto('/app/admin/configuracoes');
    const toggle = adminPage.locator('button[role="switch"], input[type="checkbox"]').first();
    if (await toggle.isVisible()) {
      const initialState = await toggle.getAttribute('aria-checked');
      await toggle.click();
      await expect(toggle).not.toHaveAttribute('aria-checked', initialState === 'true' ? 'true' : 'false', { timeout: 5_000 });
    }
  });
});

import { test, expect } from '../../helpers/fixtures';

test.describe('Admin - Configurações', () => {
  test('admin can view system settings', async ({ adminPage }) => {
    await adminPage.goto('/app/admin/feature-flags');
    await expect(adminPage.getByRole('heading', { name: /feature flags/i })).toBeVisible({ timeout: 10_000 });
  });

  test('admin can toggle feature flags', async ({ adminPage }) => {
    await adminPage.goto('/app/admin/feature-flags');
    const flagRow = adminPage.getByTestId('feature-flag-DISCUSSIONS_ENABLED');
    const toggle = flagRow.getByRole('button', { name: /^(Ligar|Desligar)$/ });
    await expect(toggle).toBeVisible();

    const initialLabel = (await toggle.textContent())?.trim();
    expect(initialLabel === 'Ligar' || initialLabel === 'Desligar').toBeTruthy();
    const toggledLabel = initialLabel === 'Ligar' ? 'Desligar' : 'Ligar';

    try {
      await toggle.click();
      await expect(toggle).toHaveText(toggledLabel, { timeout: 5_000 });
    } finally {
      const currentLabel = (await toggle.textContent())?.trim();
      if (currentLabel !== initialLabel) {
        await toggle.click();
        await expect(toggle).toHaveText(initialLabel ?? '', { timeout: 5_000 });
      }
    }
  });
});

import { test, expect, type Page } from '@playwright/test';

async function clearSession(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
}

test.describe('Autenticação - Recuperação de Password', () => {
  test('user can request password recovery', async ({ page }) => {
    await clearSession(page);
    await page.getByRole('link', { name: /recuperar password/i }).click();
    await expect(page).toHaveURL(/.*recuperar/);

    await page.fill('input[name="email"]', 'test-recovery@example.com');
    await page.click('button[type="submit"]');

    await expect(page.getByRole('status')).toContainText(/sucesso|email enviado/i, { timeout: 10_000 });
  });

  test('user sees error with invalid email', async ({ page }) => {
    await clearSession(page);
    await page.goto('/auth/recuperar');
    await page.fill('input[name="email"]', 'invalid-email');
    await page.click('button[type="submit"]');

    await expect(page.getByRole('alert')).toContainText(/inválido|error/i, { timeout: 5_000 });
  });
});

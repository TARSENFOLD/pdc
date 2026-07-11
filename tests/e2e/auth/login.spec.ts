import { test, expect } from '../../helpers/fixtures';
import type { Page } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

async function clearSession(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.addInitScript(() => {
    window.localStorage.setItem('pdc.cookie-consent.v1', JSON.stringify({
      choice: 'essential',
      acceptedAt: '2026-01-01T00:00:00.000Z',
    }));
  });
  await page.goto('/login');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('pdc.cookie-consent.v1', JSON.stringify({
      choice: 'essential',
      acceptedAt: '2026-01-01T00:00:00.000Z',
    }));
  });
}

test.describe('Autenticação - Login', () => {
  test('login page renders email and password fields', async ({ page }) => {
    await clearSession(page);
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('button', { name: /entrar|login|iniciar/i })).toBeVisible({
      timeout: 8_000,
    });
  });

  test('invalid credentials show an error message', async ({ page }) => {
    await clearSession(page);
    await page.getByRole('textbox', { name: /email/i }).fill('invalid@example.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.getByRole('button', { name: /entrar|login|iniciar/i }).click();

    // Error message must appear — do NOT go to dashboard
    await expect(page).not.toHaveURL(/dashboard/, { timeout: 8_000 });
    await expect(
      page.locator('[role="alert"], .error, [data-testid="error"]'),
    ).toBeVisible({ timeout: 8_000 });
  });

  test('aluno can log in and reaches app', async ({ page }) => {
    await clearSession(page);
    await page.getByRole('textbox', { name: /email/i }).fill('estudante@traycer.test');
    await page.locator('input[type="password"]').fill('password123');
    await page.getByRole('button', { name: /entrar|login|iniciar/i }).click();

    // With DEV_SKIP_OTP=true, should land on app without OTP step
    await expect(page).toHaveURL(/.*\/app(\/home|\/dashboard\/estudante)?(?:\?.*)?$/, { timeout: 15_000 });
  });

  test('authenticated user is redirected away from login', async ({ alunoPage }) => {
    await alunoPage.goto('/login');
    // Should be sent to app, not stay on /login
    await expect(alunoPage).not.toHaveURL(/\/login$/, { timeout: 8_000 });
  });
});

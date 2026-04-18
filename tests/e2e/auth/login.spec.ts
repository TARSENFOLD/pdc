import { test, expect } from '../../helpers/fixtures';

test.describe('Autenticação - Login', () => {
  test('login page renders email and password fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('button', { name: /entrar|login|iniciar/i })).toBeVisible({
      timeout: 8_000,
    });
  });

  test('invalid credentials show an error message', async ({ page }) => {
    await page.goto('/login');
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
    await page.goto('/login');
    await page.getByRole('textbox', { name: /email/i }).fill('aluno@traycer.test');
    await page.locator('input[type="password"]').fill('password123');
    await page.getByRole('button', { name: /entrar|login|iniciar/i }).click();

    // With DEV_SKIP_OTP=true, should land on app without OTP step
    await expect(page).toHaveURL(/.*\/app(\/dashboard\/aluno)?$/, { timeout: 15_000 });
  });

  test('authenticated user is redirected away from login', async ({ alunoPage }) => {
    await alunoPage.goto('/login');
    // Should be sent to app, not stay on /login
    await expect(alunoPage).not.toHaveURL(/\/login$/, { timeout: 8_000 });
  });
});

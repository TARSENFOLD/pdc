import { test, expect } from '@playwright/test';

test.describe('Autenticação - Recuperação de Password', () => {
  test('user can request password recovery', async ({ page }) => {
    await page.goto('/login');
    await page.click('text=Esqueceu a senha, text=Recuperar password');
    await expect(page).toHaveURL(/.*recuperar/);

    await page.fill('input[name="email"]', 'test-recovery@example.com');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Sucesso, text=email enviado')).toBeVisible({ timeout: 10_000 });
  });

  test('user sees error with invalid email', async ({ page }) => {
    await page.goto('/auth/recuperar');
    await page.fill('input[name="email"]', 'invalid-email');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=inválido, text=error')).toBeVisible({ timeout: 5_000 });
  });
});

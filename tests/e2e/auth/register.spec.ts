import { test, expect } from '../../helpers/fixtures';

test.describe('Register', () => {
  test('estudante can register with valid data', async ({ page }) => {
    await page.goto('/registo');
    await page.click('text=Estudante');

    await page.fill('input[name="nome"]', 'Teste Aluno E2E');
    await page.fill('input[name="email"]', `e2e-${Date.now()}@traycer.test`);
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.selectOption('select[name="areaInteresse"]', { index: 1 });

    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/(verificar|app)/, { timeout: 10_000 });
  });

  test('registration fails with duplicate email', async ({ page }) => {
    await page.goto('/registo');
    await page.click('text=Estudante');

    await page.fill('input[name="nome"]', 'Duplicado');
    await page.fill('input[name="email"]', 'aluno@traycer.test');
    await page.fill('input[name="password"]', 'TestPassword123!');

    await page.click('button[type="submit"]');
    await expect(page.locator('[role="alert"], .text-error, .error')).toBeVisible({ timeout: 5_000 });
  });

  test('registration page shows all account types', async ({ page }) => {
    await page.goto('/registo');
    await expect(page.locator('text=Estudante')).toBeVisible();
    await expect(page.locator('text=Mentor')).toBeVisible();
    await expect(page.locator('text=Instituição')).toBeVisible();
  });
});

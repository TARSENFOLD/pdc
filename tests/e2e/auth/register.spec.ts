import { test, expect } from '@playwright/test';

test.describe('Autenticação - Registo', () => {
  test('deve permitir o registo de um novo estudante', async ({ page }) => {
    const email = `test-${Date.now()}@example.com`;

    await page.goto('/criar-conta/estudante');
    await page.getByLabel(/nome/i).fill('Test User');
    await page.getByLabel(/email/i).fill(email);
    await page.getByRole('textbox', { name: 'Palavra-passe', exact: true }).fill('Password123!');
    await page.getByRole('textbox', { name: 'Confirmar palavra-passe' }).fill('Password123!');
    await page.getByLabel(/data de nascimento/i).fill('2000-01-01');
    await page.getByLabel(/área de interesse/i).selectOption('ENGENHARIA');
    await page.getByLabel(/nível de ensino/i).selectOption('Secundário');
    await page.getByLabel(/li e aceito/i).check();
    await page.getByRole('button', { name: /registar/i }).click();

    // Produção segue para OTP; em dev/test com DEV_SKIP_OTP=true segue direto para /app.
    await expect(page).toHaveURL(/.*(\/verificar|\/app).*/, { timeout: 15_000 });
  });
});

import { test, expect } from '@playwright/test';

test.describe('Autenticação - Registo', () => {
  test('deve permitir o registo de um novo estudante', async ({ page }) => {
    const email = `test-${Date.now()}@example.com`;

    await page.goto('/criar-conta/estudante');
    await page.getByLabel(/nome/i).fill('Test User');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/palavra-passe/i).fill('Password123!');
    await page.getByLabel(/área de interesse/i).fill('Engenharia');
    await page.getByLabel(/nível de ensino/i).fill('Secundário');
    await page.getByRole('button', { name: /registar/i }).click();

    // Verificação de redirecionamento para o dashboard após registo bem-sucedido
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByText(/bem-vindo/i)).toBeVisible();
  });
});

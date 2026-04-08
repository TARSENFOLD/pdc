import { test, expect } from '../../helpers/fixtures';

test.describe('Simulação Tipo 2', () => {
  test('simulacao catálogo público loads', async ({ page }) => {
    await page.goto('/catalogo/simulacoes');
    await expect(page.locator('h1, h2')).toBeVisible({ timeout: 10_000 });
  });

  test('aluno can browse simulacoes', async ({ alunoPage }) => {
    await alunoPage.goto('/app/simulacoes');
    await expect(alunoPage.locator('h1, h2')).toBeVisible({ timeout: 10_000 });
  });
});

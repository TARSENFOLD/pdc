import { test, expect } from '../../helpers/fixtures';

test.describe('Simulação Tipo 2', () => {
  test('simulacao catálogo público loads', async ({ page }) => {
    await page.goto('/simulacoes');
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 });
  });

  test('aluno can browse simulacoes', async ({ alunoPage }) => {
    await alunoPage.goto('/app/simulacoes');
    await expect(alunoPage.getByRole('heading').first()).toBeVisible({ timeout: 10_000 });
  });
});

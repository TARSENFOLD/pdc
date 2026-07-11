import { test, expect } from '../../helpers/fixtures';

test.describe('Simulação Tipo 1', () => {
  test('simulacao list loads', async ({ alunoPage }) => {
    await alunoPage.goto('/app/simulacoes');
    await expect(alunoPage.getByRole('heading').first()).toBeVisible({ timeout: 10_000 });
  });

  test('simulacao detail loads', async ({ alunoPage }) => {
    await alunoPage.goto('/app/simulacoes');
    const link = alunoPage.locator('a[href*="/simulacoes/"]').first();
    if (await link.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await link.click();
      await expect(alunoPage.getByRole('heading').first()).toBeVisible({ timeout: 10_000 });
    }
  });
});

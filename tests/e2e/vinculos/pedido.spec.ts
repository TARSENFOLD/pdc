import { test, expect } from '../../helpers/fixtures';

test.describe('Vínculos - Pedido', () => {
  test('aluno can view vinculos page', async ({ alunoPage }) => {
    await alunoPage.goto('/app/vinculos');
    await expect(alunoPage.getByRole('heading', { name: /rede e vínculos/i })).toBeVisible({ timeout: 10_000 });
  });

  test('vinculos page shows tabs', async ({ alunoPage }) => {
    await alunoPage.goto('/app/vinculos');
    await expect(alunoPage.locator('[role="tablist"]')).toBeVisible({ timeout: 10_000 });
  });

  test('vinculos page shows sugestões tab', async ({ alunoPage }) => {
    await alunoPage.goto('/app/vinculos');
    await alunoPage.getByRole('tab', { name: /estudantes/i }).click();
    await expect(alunoPage.getByRole('tabpanel', { name: /estudantes/i })).toBeVisible({ timeout: 5_000 });
  });
});

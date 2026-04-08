import { test, expect } from '../../helpers/fixtures';

test.describe('Vínculos - Pedido', () => {
  test('aluno can view vinculos page', async ({ alunoPage }) => {
    await alunoPage.goto('/app/vinculos');
    await expect(alunoPage.locator('h1, h2')).toBeVisible({ timeout: 10_000 });
  });

  test('vinculos page shows tabs', async ({ alunoPage }) => {
    await alunoPage.goto('/app/vinculos');
    await expect(alunoPage.locator('[role="tablist"]')).toBeVisible({ timeout: 10_000 });
  });

  test('vinculos page shows sugestões tab', async ({ alunoPage }) => {
    await alunoPage.goto('/app/vinculos');
    await alunoPage.click('text=Sugest');
    await expect(alunoPage.locator('[role="tabpanel"]')).toBeVisible({ timeout: 5_000 });
  });
});

import { test, expect } from '../../helpers/fixtures';

test.describe('Vínculos - Aprovação', () => {
  test('vinculos meus tab loads', async ({ alunoPage }) => {
    await alunoPage.goto('/app/vinculos');
    await alunoPage.click('text=Meus');
    await expect(alunoPage.locator('[role="tabpanel"]')).toBeVisible({ timeout: 5_000 });
  });

  test('vinculos pedidos tab loads', async ({ alunoPage }) => {
    await alunoPage.goto('/app/vinculos');
    await alunoPage.click('text=Pedidos');
    await expect(alunoPage.locator('[role="tabpanel"]')).toBeVisible({ timeout: 5_000 });
  });
});

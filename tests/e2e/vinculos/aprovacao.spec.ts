import { test, expect } from '../../helpers/fixtures';

test.describe('Vínculos - Aprovação', () => {
  test('vinculos meus tab loads', async ({ alunoPage }) => {
    await alunoPage.goto('/app/vinculos');
    await alunoPage.getByRole('tab', { name: /vínculos/i }).click();
    await expect(alunoPage.getByRole('tabpanel', { name: /vínculos/i })).toBeVisible({ timeout: 5_000 });
  });

  test('vinculos pedidos tab loads', async ({ alunoPage }) => {
    await alunoPage.goto('/app/vinculos');
    await alunoPage.getByRole('tab', { name: /pedidos/i }).click();
    await expect(alunoPage.getByRole('tabpanel', { name: /pedidos/i })).toBeVisible({ timeout: 5_000 });
  });
});

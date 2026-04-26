import { test, expect } from '../../helpers/fixtures';

test.describe('Admin - Instituição', () => {
  test('instituicao user can view their dashboard', async ({ instituicaoPage }) => {
    await instituicaoPage.goto('/app/dashboard/instituicao');
    await expect(instituicaoPage.locator('h1, h2').first()).toContainText(/Dashboard/i, { timeout: 10_000 });
  });

  test('instituicao can see their students', async ({ instituicaoPage }) => {
    await instituicaoPage.goto('/app/instituicao/estudantes-vinculados');
    await expect(instituicaoPage.locator('text=Estudantes Vinculados')).toBeVisible({ timeout: 10_000 });
  });
});

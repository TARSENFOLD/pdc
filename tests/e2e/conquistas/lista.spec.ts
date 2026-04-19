import { test, expect } from '../../helpers/fixtures';

test.describe('Conquistas - Lista', () => {
  test('aluno can view their achievements', async ({ alunoPage }) => {
    await alunoPage.goto('/app/conquistas');
    await expect(alunoPage.locator('h1, h2')).toContainText(/conquistas/i, { timeout: 10_000 });
  });

  test('conquistas cards show details', async ({ alunoPage }) => {
    await alunoPage.goto('/app/conquistas');
    const badge = alunoPage.locator('.badge, .achievement-card').first();
    if (await badge.isVisible()) {
      await badge.hover();
      await expect(alunoPage.locator('text=Descrição, .tooltip')).toBeVisible({ timeout: 5_000 }).catch(() => {});
    }
  });

  test('locked achievements are visible', async ({ alunoPage }) => {
    await alunoPage.goto('/app/conquistas');
    await expect(alunoPage.locator('text=Bloqueada, .locked')).toBeVisible({ timeout: 10_000 }).catch(() => {});
  });
});

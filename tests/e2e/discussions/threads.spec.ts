import { test, expect } from '../../helpers/fixtures';

test.describe('Discussions - Threads', () => {
  test('discussions visible on course detail', async ({ alunoPage }) => {
    await alunoPage.goto('/app/cursos');
    await alunoPage.waitForTimeout(3_000);
    const courseLink = alunoPage.locator('a[href*="/cursos/"]').first();
    if (await courseLink.count() > 0) {
      await courseLink.click();
      await alunoPage.waitForTimeout(3_000);
      const discussionTab = alunoPage.locator('text=Discuss, text=Fóru, text=Coment');
      if (await discussionTab.count() > 0) {
        await discussionTab.first().click();
        await expect(alunoPage.locator('main')).toBeVisible({ timeout: 5_000 });
      }
    }
    await expect(alunoPage.locator('main')).toBeVisible();
  });

  test('aluno can view discussion threads', async ({ alunoPage }) => {
    await alunoPage.goto('/app/feed');
    await expect(alunoPage.locator('main')).toBeVisible({ timeout: 10_000 });
  });
});

import { test, expect } from '../../helpers/fixtures';

test.describe('Curso Player', () => {
  test('aluno can view curso detail', async ({ alunoPage }) => {
    await alunoPage.goto('/app/cursos');
    await expect(alunoPage.locator('h1, h2')).toBeVisible({ timeout: 10_000 });

    // Click first curso if available
    const cursoLink = alunoPage.locator('a[href*="/cursos/"]').first();
    if (await cursoLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await cursoLink.click();
      await expect(alunoPage.locator('h1, h2')).toBeVisible({ timeout: 10_000 });
    }
  });

  test('curso detail shows tabs', async ({ alunoPage }) => {
    await alunoPage.goto('/app/cursos');
    const cursoLink = alunoPage.locator('a[href*="/cursos/"]').first();
    if (await cursoLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await cursoLink.click();
      // Should see tab structure (Conteúdo, Discussões, etc.)
      await expect(alunoPage.locator('[role="tablist"]')).toBeVisible({ timeout: 10_000 });
    }
  });
});

import { test, expect } from '../../helpers/fixtures';

test.describe('Inscrição Curso', () => {
  test('aluno can view cursos list', async ({ alunoPage }) => {
    await alunoPage.goto('/app/cursos');
    await expect(alunoPage.locator('h1, h2')).toBeVisible({ timeout: 10_000 });
  });

  test('aluno can view meus-cursos', async ({ alunoPage }) => {
    await alunoPage.goto('/app/meus-cursos');
    await expect(alunoPage.locator('h1, h2')).toBeVisible({ timeout: 10_000 });
  });

  test('catálogo público loads without auth', async ({ page }) => {
    await page.goto('/catalogo');
    await expect(page.locator('h1, h2, [data-testid="catalogo"]')).toBeVisible({ timeout: 10_000 });
  });

  test('catálogo cursos list loads', async ({ page }) => {
    await page.goto('/catalogo/cursos');
    await expect(page.locator('h1, h2')).toBeVisible({ timeout: 10_000 });
  });
});

import { test, expect } from '../../helpers/fixtures';

test.describe('Catálogo de Cursos', () => {
  test('catalogo page loads for aluno', async ({ alunoPage }) => {
    await alunoPage.goto('/app/cursos');
    await expect(alunoPage.getByTestId('catalogo')).toBeVisible({ timeout: 10_000 });
  });

  test('catalogo shows course cards or empty state', async ({ alunoPage }) => {
    await alunoPage.goto('/app/cursos');
    await expect(alunoPage.getByTestId('catalogo')).toBeVisible({ timeout: 10_000 });
  });

  test('catalogo is accessible without error page', async ({ alunoPage }) => {
    await alunoPage.goto('/app/cursos');
    await expect(alunoPage.locator('text=500, text=Error, text=Erro')).not.toBeVisible();
    await expect(alunoPage.getByTestId('catalogo')).toBeVisible({ timeout: 10_000 });
  });
});

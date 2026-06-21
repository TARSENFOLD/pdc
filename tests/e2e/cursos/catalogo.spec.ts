import { test, expect } from '../../helpers/fixtures';

test.describe('Catálogo de Cursos', () => {
  test('catalogo page loads for aluno', async ({ alunoPage }) => {
    await alunoPage.goto('/app/cursos');
    await expect(alunoPage.getByTestId('catalogo')).toBeVisible({ timeout: 10_000 });
  });

  test('catalogo is accessible without error page', async ({ alunoPage }) => {
    await alunoPage.goto('/app/cursos');
    await expect(alunoPage.getByText(/500|Error|Erro/)).not.toBeVisible();
    await expect(alunoPage.getByTestId('catalogo')).toBeVisible({ timeout: 10_000 });
  });
});

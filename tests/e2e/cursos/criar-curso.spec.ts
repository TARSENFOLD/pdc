import { test, expect } from '../../helpers/fixtures';

test.describe('Criar Curso', () => {
  test('mentor can create and publish a curso', async ({ mentorPage }) => {
    await mentorPage.goto('/app/mentor/cursos/criar');
    await expect(mentorPage.locator('form')).toBeVisible({ timeout: 10_000 });

    await mentorPage.fill('input[name="titulo"]', `Curso E2E ${Date.now()}`);
    await mentorPage.fill('textarea[name="descricao"], input[name="descricao"]', 'Descrição automática do teste E2E com mais de dez caracteres.');
    await mentorPage.fill('input[name="area"]', 'Tecnologia');

    await mentorPage.click('button:has-text("Publicar")');
    await expect(mentorPage.locator('text=Sucesso, text=sucesso, text=criado')).toBeVisible({ timeout: 10_000 });
  });

  test('mentor sees curso list', async ({ mentorPage }) => {
    await mentorPage.goto('/app/mentor/cursos');
    await expect(mentorPage.locator('h1, h2')).toBeVisible({ timeout: 10_000 });
  });

  test('aluno cannot create cursos', async ({ alunoPage }) => {
    await alunoPage.goto('/app/mentor/cursos/criar');
    await expect(alunoPage).not.toHaveURL(/mentor\/cursos\/criar/, { timeout: 5_000 });
  });
});

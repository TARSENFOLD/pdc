import { test, expect } from '../../helpers/fixtures';
import { z } from 'zod';

const CreatedCourseSchema = z.object({ documentId: z.string().min(1) });

test.describe('Criar Curso', () => {
  test('QA interno cria e reabre rascunho no RichShell', async ({ adminPage }) => {
    await adminPage.goto('/app/mentor/cursos/criar');
    await expect(adminPage.locator('form')).toBeVisible({ timeout: 10_000 });
    await expect(adminPage.getByRole('navigation', { name: 'Etapas de criação' })).toBeVisible();

    const title = `Curso E2E ${Date.now()}`;
    await adminPage.fill('input[name="titulo"]', title);
    await adminPage.fill('textarea[name="descricao"], input[name="descricao"]', 'Descrição automática do teste E2E com mais de dez caracteres.');
    await adminPage.selectOption('select[name="area"]', 'TECNOLOGIA');

    const createResponsePromise = adminPage.waitForResponse((response) =>
      response.url().endsWith('/cursos') && response.request().method() === 'POST',
    );
    await adminPage.getByRole('button', { name: 'Salvar Rascunho' }).click();
    const createResponse = await createResponsePromise;
    expect(createResponse.status()).toBe(201);
    const created = CreatedCourseSchema.parse(await createResponse.json());

    const previewResponsePromise = adminPage.waitForResponse((response) =>
      response.url().includes(`/cursos/${created.documentId}?preview=true`)
        && response.request().method() === 'GET',
    );
    await adminPage.goto(`/app/mentor/cursos/${created.documentId}/editar`);
    const previewResponse = await previewResponsePromise;
    const previewBody = await previewResponse.text();
    expect(previewResponse.status(), previewBody).toBe(200);
    await expect(adminPage.locator('input[name="titulo"]')).toHaveValue(title);
    await expect(adminPage.locator('select[name="area"]')).toHaveValue('TECNOLOGIA');
  });

  test('mentor externo recebe indisponibilidade clara no builder', async ({ mentorPage }) => {
    await mentorPage.goto('/app/mentor/cursos/criar');
    await expect(mentorPage.getByText('Estúdio temporariamente indisponível')).toBeVisible();
    await expect(mentorPage.locator('form')).toHaveCount(0);
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

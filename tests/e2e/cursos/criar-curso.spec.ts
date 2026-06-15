import { test, expect } from '../../helpers/fixtures';

test.describe('Criar Curso', () => {
  test('mentor cria rascunho no RichShell e submete para revisão', async ({ mentorPage }) => {
    await mentorPage.goto('/app/mentor/cursos/criar');
    await expect(mentorPage.locator('form')).toBeVisible({ timeout: 10_000 });
    await expect(mentorPage.getByRole('navigation', { name: 'Etapas de criação' })).toBeVisible();

    const title = `Curso E2E ${Date.now()}`;
    await mentorPage.fill('input[name="titulo"]', title);
    await mentorPage.fill('textarea[name="descricao"], input[name="descricao"]', 'Descrição automática do teste E2E com mais de dez caracteres.');
    await mentorPage.selectOption('select[name="area"]', 'TECNOLOGIA');

    const createResponsePromise = mentorPage.waitForResponse((response) =>
      response.url().endsWith('/cursos') && response.request().method() === 'POST',
    );
    await mentorPage.getByRole('button', { name: 'Salvar Rascunho' }).click();
    const createResponse = await createResponsePromise;
    expect(createResponse.status()).toBe(201);
    const created = await createResponse.json() as { id: string | number };

    await mentorPage.goto(`/app/mentor/cursos/${String(created.id)}/editar`);
    await expect(mentorPage.locator('input[name="titulo"]')).toHaveValue(title);
    await expect(mentorPage.locator('select[name="area"]')).toHaveValue('TECNOLOGIA');

    const reviewRequestPromise = mentorPage.waitForRequest(
      (request) => request.url().includes('/cursos/') && request.method() === 'PUT',
      { timeout: 10_000 },
    );
    await mentorPage.getByRole('button', { name: 'Submeter para Revisão' }).click();
    const validationMessage = mentorPage.getByText(/Campos inválidos:/);
    const reviewRequest = await Promise.race([
      reviewRequestPromise,
      validationMessage.waitFor({ state: 'visible', timeout: 2_000 }).then(async () => {
        throw new Error(await validationMessage.textContent() ?? 'Validação do curso falhou');
      }),
    ]);
    const reviewResponse = await reviewRequest.response();
    expect(reviewResponse).not.toBeNull();
    if (!reviewResponse) throw new Error('Resposta de revisão ausente');
    if (!reviewResponse.ok()) {
      throw new Error(`Falha ao submeter revisão de ${String(created.id)} (${String(reviewResponse.status())}): ${await reviewResponse.text()}`);
    }
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

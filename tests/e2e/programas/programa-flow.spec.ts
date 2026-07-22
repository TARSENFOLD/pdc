import { expect, test } from '../../helpers/fixtures';

test.describe('Programa - criar, editar e consumir', () => {
  test.setTimeout(60_000);

  test('instituição cria com curso, edita com seleção hidratada e consome o hub', async ({
    instituicaoPage,
  }) => {
    const titulo = `Programa E2E ${Date.now()}`;

    await instituicaoPage.goto('/app/instituicao/criar-programa');
    await instituicaoPage.locator('input[name="titulo"]').fill(titulo);
    await instituicaoPage.locator('textarea[name="proposito"]')
      .fill('Validar a jornada completa de um programa com conteúdos relacionados.');
    await instituicaoPage.getByRole('button', { name: /Metodologia/ }).click();
    await instituicaoPage.locator('textarea[name="metodologia"]')
      .fill('Agrupar um curso e confirmar a persistência da seleção ao editar.');

    await instituicaoPage.getByRole('button', { name: /Conteúdos/ }).click();
    const courseCheckboxes = instituicaoPage.getByRole('region', { name: 'Conteúdos Agrupados' })
      .getByRole('region', { name: 'Cursos' })
      .getByRole('checkbox');
    await expect(courseCheckboxes).not.toHaveCount(0);
    await courseCheckboxes.first().check();
    const cursoSelecionado = await courseCheckboxes.first().getAttribute('value');
    expect(cursoSelecionado).toBeTruthy();

    await instituicaoPage.getByRole('button', { name: /Inscrição/ }).click();
    const createResponsePromise = instituicaoPage.waitForResponse((response) =>
      response.url().endsWith('/programas') && response.request().method() === 'POST'
    );
    await instituicaoPage.getByRole('button', { name: /salvar rascunho/i }).click();
    const createResponse = await createResponsePromise;
    const createBody = await createResponse.text();
    expect(createResponse.status(), createBody).toBe(201);

    await instituicaoPage.goto('/app/instituicao/programas');
    const programaRow = instituicaoPage.getByRole('article', { name: titulo });
    await programaRow.getByRole('link', { name: /editar/i }).click();
    await expect(instituicaoPage.locator('input[name="titulo"]')).toHaveValue(titulo);
    await instituicaoPage.getByRole('button', { name: /Conteúdos/ }).click();
    await expect(
      instituicaoPage.getByRole('region', { name: 'Conteúdos Agrupados' })
        .getByRole('checkbox', { checked: true }),
    ).toHaveValue(cursoSelecionado!);

    const programaId = new URL(instituicaoPage.url()).pathname.split('/').at(-1);
    expect(programaId).toBeTruthy();

    await instituicaoPage.goto(`/app/programas/${programaId}`);
    await expect(instituicaoPage.getByRole('heading', { name: titulo })).toBeVisible();
    await expect(instituicaoPage.getByText('Cursos (1)')).toBeVisible();
  });
});

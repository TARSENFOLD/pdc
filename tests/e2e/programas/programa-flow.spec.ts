import { expect, test } from '../../helpers/fixtures';
import { z } from 'zod';

test.describe('Programa - criar, editar e pré-visualizar', () => {
  test.setTimeout(60_000);

  test('QA interno cria com curso, edita com seleção hidratada e não publica o draft', async ({
    adminPage,
  }) => {
    const titulo = `Programa E2E ${Date.now()}`;

    await adminPage.goto('/app/instituicao/criar-programa');
    await adminPage.locator('input[name="titulo"]').fill(titulo);
    await adminPage.locator('textarea[name="proposito"]')
      .fill('Validar a jornada completa de um programa com conteúdos relacionados.');
    await adminPage.getByRole('button', { name: /Metodologia/ }).click();
    await adminPage.locator('textarea[name="metodologia"]')
      .fill('Agrupar um curso e confirmar a persistência da seleção ao editar.');

    await adminPage.getByRole('button', { name: /Conteúdos/ }).click();
    const courseCheckboxes = adminPage.getByRole('region', { name: 'Conteúdos Agrupados' })
      .getByRole('region', { name: 'Cursos' })
      .getByRole('checkbox');
    await expect(courseCheckboxes).not.toHaveCount(0);
    await courseCheckboxes.first().check();
    const cursoSelecionado = await courseCheckboxes.first().getAttribute('value');
    expect(cursoSelecionado).toBeTruthy();

    await adminPage.getByRole('button', { name: /Inscrição/ }).click();
    const createResponsePromise = adminPage.waitForResponse((response) =>
      response.url().endsWith('/programas') && response.request().method() === 'POST'
    );
    await adminPage.getByRole('button', { name: /salvar rascunho/i }).click();
    const createResponse = await createResponsePromise;
    const createBody = await createResponse.text();
    expect(createResponse.status(), createBody).toBe(201);

    await adminPage.goto('/app/instituicao/programas');
    const programaRow = adminPage.getByRole('article', { name: titulo });
    await programaRow.getByRole('link', { name: /editar/i }).click();
    await expect(adminPage.locator('input[name="titulo"]')).toHaveValue(titulo);
    await adminPage.getByRole('button', { name: /Conteúdos/ }).click();
    await expect(
      adminPage.getByRole('region', { name: 'Conteúdos Agrupados' })
        .getByRole('checkbox', { checked: true }),
    ).toHaveValue(cursoSelecionado!);

    const programaId = new URL(adminPage.url()).pathname.split('/').at(-1);
    expect(programaId).toBeTruthy();

    const previewResponse = await adminPage.request.get(`/api/programas/${programaId}?preview=true`);
    const previewBody = z.object({ titulo: z.string() }).passthrough().parse(await previewResponse.json());
    expect(previewResponse.status(), JSON.stringify(previewBody)).toBe(200);
    expect(previewBody).toMatchObject({ titulo });

    const learnerResponse = await adminPage.request.get(`/api/programas/${programaId}`);
    expect(learnerResponse.status()).toBe(404);
    await expect(learnerResponse.json()).resolves.toEqual({
      error: 'Conteúdo não encontrado.',
      code: 'CONTENT_NOT_FOUND',
    });
  });
});

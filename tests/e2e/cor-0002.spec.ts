import type { APIResponse } from '@playwright/test';
import { expect, test } from '../helpers/fixtures';

const PRIVATE_COURSE = 'curso-nao-publicado-cor-0002-e2e';
const MISSING_COURSE = 'curso-inexistente-cor-0002-e2e';

async function expectContentNotFound(response: APIResponse): Promise<void> {
  expect(response.status()).toBe(404);
  expect(await response.json()).toEqual({
    error: 'Conteúdo não encontrado.',
    code: 'CONTENT_NOT_FOUND',
  });
}

test.describe('COR-0002 — conteúdo não publicado', () => {
  test('ID privado e inexistente têm a mesma resposta pública', async ({ page }) => {
    const [privateResponse, missingResponse] = await Promise.all([
      page.request.get(`/api/cursos/${PRIVATE_COURSE}`),
      page.request.get(`/api/cursos/${MISSING_COURSE}`),
    ]);

    await expectContentNotFound(privateResponse);
    await expectContentNotFound(missingResponse);
  });

  test('chamada directa, progresso e alias legado não contornam a regra', async ({ alunoPage }) => {
    const [canonical, legacyAlias, progressRead, progressWrite] = await Promise.all([
      alunoPage.request.post(`/api/cursos/${PRIVATE_COURSE}/inscricao`),
      alunoPage.request.post(`/api/cursos/${PRIVATE_COURSE}/inscrever`),
      alunoPage.request.get(`/api/cursos/${PRIVATE_COURSE}/progresso`),
      alunoPage.request.patch(`/api/cursos/${PRIVATE_COURSE}/progresso/item-inexistente`, {
        data: { concluido: true },
      }),
    ]);

    await expectContentNotFound(canonical);
    await expectContentNotFound(legacyAlias);
    await expectContentNotFound(progressRead);
    await expectContentNotFound(progressWrite);
  });

  test('preview autorizado é explícito e a rota learner devolve PREVIEW_ONLY', async ({ adminPage }) => {
    const preview = await adminPage.request.get(`/api/cursos/${PRIVATE_COURSE}?preview=true`);
    expect(preview.status(), await preview.text()).toBe(200);

    const learner = await adminPage.request.post(`/api/cursos/${PRIVATE_COURSE}/inscricao`);
    expect(learner.status()).toBe(403);
    expect(await learner.json()).toEqual({
      error: 'Este conteúdo só está disponível em pré-visualização.',
      code: 'PREVIEW_ONLY',
    });
  });
});

import { expect, test } from '../../helpers/fixtures';

test.describe('Projeto - criação e operação', () => {
  test('instituição cria em focus mode com tags e abre pedidos', async ({ instituicaoPage }) => {
    const title = `Projeto E2E ${Date.now()}`;
    await instituicaoPage.goto('/app/projetos/novo');

    await expect(instituicaoPage.getByTestId('focus-header')).toBeVisible();
    await expect(instituicaoPage.getByRole('heading', { name: 'Criar projeto' })).toBeVisible();
    await expect(instituicaoPage.locator('aside').filter({ hasText: 'Gestão Institucional' })).toHaveCount(0);

    await instituicaoPage.locator('input[name="titulo"]').fill(title);
    await instituicaoPage.getByRole('button', { name: /Pitch Público/ }).click();
    await instituicaoPage.locator('textarea[name="abstract"]').fill(
      'Uma solução de colaboração para ampliar oportunidades de jovens em Angola.',
    );
    await instituicaoPage.getByRole('button', { name: /Modos de Atuação/ }).click();
    await instituicaoPage.getByText('Colaboração', { exact: true }).click();
    await instituicaoPage.getByRole('button', { name: /Núcleo Técnico/ }).click();
    await instituicaoPage.locator('textarea[name="core"]').fill(
      'Arquitetura, plano de execução e critérios privados para os colaboradores aprovados.',
    );
    await instituicaoPage.getByRole('button', { name: /Repositórios e Tags/ }).click();
    await instituicaoPage.getByPlaceholder('Ex.: Saúde Angola').fill('Saúde Angola');
    await instituicaoPage.getByRole('button', { name: 'Adicionar tag' }).click();
    await expect(instituicaoPage.getByText('#Saúde Angola')).toBeVisible();

    const createResponsePromise = instituicaoPage.waitForResponse((response) =>
      response.url().endsWith('/projetos') && response.request().method() === 'POST',
    );
    await instituicaoPage.getByRole('button', { name: /salvar rascunho/i }).click();
    const createResponse = await createResponsePromise;
    const createBody = await createResponse.text();
    expect(createResponse.status(), createBody).toBe(201);
    const created = JSON.parse(createBody) as { id?: string | number };
    expect(created.id).toBeTruthy();

    await instituicaoPage.goto(`/app/projetos/${String(created.id)}/pedidos`);
    await expect(instituicaoPage.getByRole('heading', { name: 'Pedidos de acesso' })).toBeVisible();
    await expect(instituicaoPage.getByText('Ainda não existem pedidos de acesso.')).toBeVisible();

    await instituicaoPage.goto(`/app/projetos/${String(created.id)}/colaboracao`);
    await expect(instituicaoPage.getByRole('heading', { name: title })).toBeVisible();
    await expect(instituicaoPage.getByRole('heading', { name: 'Núcleo técnico' })).toBeVisible();
  });
});

import { expect, test } from '../../helpers/fixtures';

test.describe('Projeto - criação e operação', () => {
  test('QA interno cria em focus mode com tags e abre pedidos', async ({ adminPage }) => {
    const title = `Projeto E2E ${Date.now()}`;
    await adminPage.goto('/app/projetos/novo');

    await expect(adminPage.getByTestId('focus-header')).toBeVisible();
    await expect(adminPage.getByRole('heading', { name: 'Criar projeto' })).toBeVisible();
    await expect(adminPage.locator('aside').filter({ hasText: 'Gestão Institucional' })).toHaveCount(0);

    await adminPage.locator('input[name="titulo"]').fill(title);
    await adminPage.getByRole('button', { name: /Pitch Público/ }).click();
    await adminPage.locator('textarea[name="abstract"]').fill(
      'Uma solução de colaboração para ampliar oportunidades de jovens em Angola.',
    );
    await adminPage.getByRole('button', { name: /Modos de Atuação/ }).click();
    await adminPage.getByText('Colaboração', { exact: true }).click();
    await adminPage.getByRole('button', { name: /Núcleo Técnico/ }).click();
    await adminPage.locator('textarea[name="core"]').fill(
      'Arquitetura, plano de execução e critérios privados para os colaboradores aprovados.',
    );
    await adminPage.getByRole('button', { name: /Repositórios e Tags/ }).click();
    await adminPage.getByPlaceholder('Ex.: Saúde Angola').fill('Saúde Angola');
    await adminPage.getByRole('button', { name: 'Adicionar tag' }).click();
    await expect(adminPage.getByText('#Saúde Angola')).toBeVisible();

    const createResponsePromise = adminPage.waitForResponse((response) =>
      response.url().endsWith('/projetos') && response.request().method() === 'POST',
    );
    await adminPage.getByRole('button', { name: /salvar rascunho/i }).click();
    const createResponse = await createResponsePromise;
    const createBody = await createResponse.text();
    expect(createResponse.status(), createBody).toBe(201);
    const created = JSON.parse(createBody) as { id?: string | number };
    expect(created.id).toBeTruthy();

    await adminPage.goto(`/app/projetos/${String(created.id)}/pedidos`);
    await expect(adminPage.getByRole('heading', { name: 'Pedidos de acesso' })).toBeVisible();
    await expect(adminPage.getByText('Ainda não existem pedidos de acesso.')).toBeVisible();

    await adminPage.goto(`/app/projetos/${String(created.id)}/colaboracao`);
    await expect(adminPage.getByRole('heading', { name: title })).toBeVisible();
    await expect(adminPage.getByRole('heading', { name: 'Núcleo técnico' })).toBeVisible();
  });
});

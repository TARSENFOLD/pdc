import { expect, test } from '../helpers/fixtures';

test.describe('COR-0001 — contenção externa', () => {
  test('signup externo é fechado na UI e no BFF', async ({ page }) => {
    await page.goto('/criar-conta/mentor');
    await expect(page.getByText('Registo de criadores temporariamente indisponível')).toBeVisible();

    const response = await page.request.post('/api/auth/register/mentor');
    expect(response.status()).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      code: 'EXTERNAL_CREATOR_ONBOARDING_TEMPORARILY_DISABLED',
    });
  });

  test('chamada directa de submissão recebe o erro canónico', async ({ mentorPage }) => {
    const response = await mentorPage.request.post('/api/cursos/qualquer/submeter');

    expect(response.status()).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      code: 'CONTENT_SUBMISSION_TEMPORARILY_DISABLED',
    });
  });

  test('builder e publicação externa de projecto permanecem fechados', async ({
    instituicaoPage,
  }) => {
    await instituicaoPage.goto('/app/instituicao/criar-programa');
    await expect(instituicaoPage.getByText('Estúdio temporariamente indisponível')).toBeVisible();

    const response = await instituicaoPage.request.post('/api/projetos');
    expect(response.status()).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      code: 'EXTERNAL_PROJECT_PUBLICATION_TEMPORARILY_DISABLED',
    });
  });

  test('certificados apresentam apenas empty state neutro', async ({ alunoPage }) => {
    await alunoPage.goto('/app/certificados');

    await expect(alunoPage.getByText('Certificados temporariamente indisponíveis')).toBeVisible();
    await expect(alunoPage.getByText(/Blockchain de Mérito/i)).toHaveCount(0);
  });

  test('relatórios ocultam analítica avançada e mostram contagens reais', async ({
    instituicaoPage,
  }) => {
    await instituicaoPage.route('**/api/experiencias/stats', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        conteudosTotais: 2,
        inscricoesTotais: 7,
        participacoesTotais: 3,
      }),
    }));

    await instituicaoPage.goto('/app/instituicao/relatorios');

    await expect(instituicaoPage.getByText('Contagens disponíveis')).toBeVisible();
    await expect(instituicaoPage.getByText('Participações')).toBeVisible();
    await expect(instituicaoPage.getByText('Redução de Evasão')).toHaveCount(0);
    await expect(instituicaoPage.getByText('Cluster de Talentos')).toHaveCount(0);
  });
});

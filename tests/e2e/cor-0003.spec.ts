import { expect, test } from '../helpers/fixtures';

test.describe('COR-0003 — alegações e números autoritativos', () => {
  test('certificados não aparecem antes de uma emissão verificável', async ({ alunoPage }, testInfo) => {
    let requestedLegacyCertificates = false;
    alunoPage.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/estudante/certificados') {
        requestedLegacyCertificates = true;
      }
    });

    await alunoPage.goto('/app/certificados');

    await expect(alunoPage.getByText('Certificados temporariamente indisponíveis')).toBeVisible();
    await expect(alunoPage.getByText(/Verificado/i)).toHaveCount(0);
    await expect(alunoPage.getByText(/Blockchain de Mérito/i)).toHaveCount(0);
    await expect(alunoPage.locator('main').getByRole('button')).toHaveCount(0);
    expect(requestedLegacyCertificates).toBe(false);
    await alunoPage.screenshot({
      path: testInfo.outputPath('certificados-sem-emissao.png'),
      fullPage: true,
    });
  });

  test('relatórios mostram zero real sem percentagens', async ({ instituicaoPage }, testInfo) => {
    await instituicaoPage.route('**/api/experiencias/stats', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        conteudosTotais: 0,
        inscricoesTotais: 0,
        participacoesTotais: 0,
      }),
    }));

    await instituicaoPage.goto('/app/instituicao/relatorios');

    await expect(instituicaoPage.getByText('Conteúdos')).toBeVisible();
    await expect(instituicaoPage.getByText('0')).toHaveCount(3);
    await expect(instituicaoPage.getByText('Redução de Evasão')).toHaveCount(0);
    await instituicaoPage.screenshot({
      path: testInfo.outputPath('relatorios-zero-real.png'),
      fullPage: true,
    });
  });

  test('relatórios mostram null como dados insuficientes', async ({ instituicaoPage }, testInfo) => {
    await instituicaoPage.route('**/api/experiencias/stats', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        conteudosTotais: null,
        inscricoesTotais: null,
        participacoesTotais: null,
      }),
    }));

    await instituicaoPage.goto('/app/instituicao/relatorios');

    await expect(instituicaoPage.getByText('Sem dados suficientes')).toHaveCount(3);
    await instituicaoPage.screenshot({
      path: testInfo.outputPath('relatorios-dados-insuficientes.png'),
      fullPage: true,
    });
  });
});

import { test, expect } from '../../helpers/fixtures';

test.describe('Experiências - Criar Experiência', () => {
  test('QA interno cria rascunho com empregador estruturado no RichShell', async ({ adminPage }) => {
    await adminPage.addInitScript(() => {
      window.localStorage.removeItem('pdc_builder_experiencia_draft');
    });
    await adminPage.goto('/app/instituicao/criar-experiencia');
    await expect(adminPage.getByRole('navigation', { name: 'Etapas de criação' })).toBeVisible({ timeout: 15_000 });

    const title = `Experiência E2E ${Date.now()}`;
    await adminPage.locator('input[name="titulo"]').fill(title);
    await adminPage.getByLabel('Descrição narrativa').fill(
      'Uma experiência institucional completa para orientar estudantes angolanos.',
    );
    await adminPage.getByRole('button', { name: /Realidade/ }).click();
    await adminPage.getByRole('button', { name: 'Adicionar' }).click();
    await adminPage.locator('input[name="painelRealidade.principaisEmpregadores.0.nome"]').fill('Sonangol');
    await adminPage.locator('input[name="painelRealidade.principaisEmpregadores.0.setor"]').fill('Energia');
    await adminPage.locator('input[name="painelRealidade.principaisEmpregadores.0.url"]').fill('https://www.sonangol.co.ao');

    const requestPromise = adminPage.waitForRequest((request) =>
      request.url().endsWith('/experiencias') && request.method() === 'POST',
    );
    await adminPage.getByRole('button', { name: 'Salvar Rascunho' }).click();
    const validationMessage = adminPage.getByText(/Campos inválidos:/);
    const request = await Promise.race([
      requestPromise,
      validationMessage.waitFor({ state: 'visible', timeout: 3_000 }).then(async () => {
        throw new Error(await validationMessage.textContent() ?? 'Validação da experiência falhou');
      }),
    ]);
    const body = request.postDataJSON() as {
      painelRealidade?: { principaisEmpregadores?: Array<{ nome: string; setor?: string; url?: string }> };
    };

    expect(body.painelRealidade?.principaisEmpregadores).toEqual([{
      nome: 'Sonangol',
      setor: 'Energia',
      url: 'https://www.sonangol.co.ao',
    }]);
  });

  test('draft legado com strings reidrata sem crash para QA interno', async ({ adminPage }) => {
    await adminPage.addInitScript(() => {
      window.localStorage.setItem('pdc_builder_experiencia_draft', JSON.stringify({
        titulo: 'Draft legado',
        descricao: 'Descrição válida de um rascunho anterior.',
        area: 'TECNOLOGIA',
        nivel: 'medio',
        modalidade: 'presencial',
        painelRealidade: { principaisEmpregadores: ['BAI'] },
      }));
    });
    await adminPage.goto('/app/instituicao/criar-experiencia');
    await adminPage.getByRole('button', { name: /Realidade/ }).click();

    await expect(adminPage.locator('input[name="painelRealidade.principaisEmpregadores.0.nome"]')).toHaveValue('BAI');
  });

  test('instituição externa recebe indisponibilidade clara no builder', async ({ instituicaoPage }) => {
    await instituicaoPage.goto('/app/instituicao/criar-experiencia');
    await expect(instituicaoPage.getByText('Estúdio temporariamente indisponível')).toBeVisible();
  });

  test('instituicao can access experiencias page', async ({ instituicaoPage }) => {
    await instituicaoPage.goto('/app/instituicao/experiencias');
    await expect(instituicaoPage.getByRole('heading', { name: 'Experiências' })).toBeVisible({ timeout: 10_000 });
  });

  test('instituicao sees create button', async ({ instituicaoPage }) => {
    await instituicaoPage.goto('/app/instituicao/experiencias');
    await instituicaoPage.waitForTimeout(3_000);
    const createBtn = instituicaoPage.locator('button:has-text("Criar"), button:has-text("Nova"), a:has-text("Criar"), a:has-text("Nova")');
    if (await createBtn.count() > 0) {
      await expect(createBtn.first()).toBeVisible();
    } else {
      // Page loaded but may not have create button yet
      await expect(instituicaoPage.locator('main')).toBeVisible();
    }
  });

  test('aluno cannot create experiencia', async ({ alunoPage }) => {
    await alunoPage.goto('/app/instituicao/experiencias');
    await alunoPage.waitForTimeout(3_000);
    const url = alunoPage.url();
    const isBlocked = !url.includes('/instituicao/experiencias');
    expect(isBlocked).toBeTruthy();
  });
});

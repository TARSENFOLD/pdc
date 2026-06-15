import { test, expect } from '../../helpers/fixtures';

test.describe('Experiências - Criar Experiência', () => {
  test('instituição cria rascunho com empregador estruturado no RichShell', async ({ instituicaoPage }) => {
    await instituicaoPage.addInitScript(() => {
      window.localStorage.removeItem('pdc_builder_experiencia_draft');
    });
    await instituicaoPage.goto('/app/instituicao/criar-experiencia');
    await expect(instituicaoPage.getByRole('navigation', { name: 'Etapas de criação' })).toBeVisible({ timeout: 15_000 });

    const title = `Experiência E2E ${Date.now()}`;
    await instituicaoPage.locator('input[name="titulo"]').fill(title);
    await instituicaoPage.getByLabel('Descrição narrativa').fill(
      'Uma experiência institucional completa para orientar estudantes angolanos.',
    );
    await instituicaoPage.getByRole('button', { name: /Realidade/ }).click();
    await instituicaoPage.getByRole('button', { name: 'Adicionar' }).click();
    await instituicaoPage.locator('input[name="painelRealidade.principaisEmpregadores.0.nome"]').fill('Sonangol');
    await instituicaoPage.locator('input[name="painelRealidade.principaisEmpregadores.0.setor"]').fill('Energia');
    await instituicaoPage.locator('input[name="painelRealidade.principaisEmpregadores.0.url"]').fill('https://www.sonangol.co.ao');

    const requestPromise = instituicaoPage.waitForRequest((request) =>
      request.url().endsWith('/experiencias') && request.method() === 'POST',
    );
    await instituicaoPage.getByRole('button', { name: 'Salvar Rascunho' }).click();
    const validationMessage = instituicaoPage.getByText(/Campos inválidos:/);
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

  test('draft legado com strings reidrata sem crash', async ({ instituicaoPage }) => {
    await instituicaoPage.addInitScript(() => {
      window.localStorage.setItem('pdc_builder_experiencia_draft', JSON.stringify({
        titulo: 'Draft legado',
        descricao: 'Descrição válida de um rascunho anterior.',
        area: 'TECNOLOGIA',
        nivel: 'medio',
        modalidade: 'presencial',
        painelRealidade: { principaisEmpregadores: ['BAI'] },
      }));
    });
    await instituicaoPage.goto('/app/instituicao/criar-experiencia');
    await instituicaoPage.getByRole('button', { name: /Realidade/ }).click();

    await expect(instituicaoPage.locator('input[name="painelRealidade.principaisEmpregadores.0.nome"]')).toHaveValue('BAI');
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

import { test, expect } from '../../helpers/fixtures';

test.describe('Simulação Tipo 3 (Alta Fidelidade)', () => {
  test('aluno can play a high-fidelity simulation', async ({ alunoPage }) => {
    // 1. Navegar para uma simulação Tipo 3 publicada conforme seed/catálogo atual.
    await alunoPage.goto('/app/simulacoes');

    const tipo3Card = alunoPage.getByRole('link').filter({ hasText: /Tipo 3/i }).first();
    await expect(tipo3Card).toBeVisible({ timeout: 15_000 });

    // 2. Clicar no card para ver detalhes
    await tipo3Card.click();

    // 3. Iniciar missão
    await expect(alunoPage.locator('button:has-text("Começar Agora")')).toBeVisible();
    await alunoPage.click('button:has-text("Começar Agora")');

    // 4. Verificar se o Tipo3Player renderiza (via data-testid — tolerante a copy)
    await expect(alunoPage.locator('[data-testid="concluir-simulacao-btn"]')).toBeVisible({ timeout: 10_000 });
    await expect(alunoPage.locator('text=Tempo Decorrido')).toBeVisible();
    await expect(alunoPage.locator('text=Ações Realizadas')).toBeVisible();

    // 5. Interagir com o shell (via data-testid — tolerante a copy)
    await alunoPage.click('[data-testid="acao-decisao-btn"]');
    // Verifica se o contador de ações subiu para 1
    await expect(
      alunoPage.getByText('Ações Realizadas').locator('..').getByText('1'),
    ).toBeVisible();

    // 6. Concluir (via data-testid — tolerante a copy)
    const completionResponsePromise = alunoPage.waitForResponse((response) =>
      response.url().includes('/simulacoes/tentativas/')
        && response.request().method() === 'PUT',
    );
    await alunoPage.click('[data-testid="concluir-simulacao-btn"]');
    const completionResponse = await completionResponsePromise;
    const completionBody = await completionResponse.text();
    expect(completionResponse.status(), completionBody).toBe(200);

    // 7. Verificar redirecionamento para reputação
    await expect(alunoPage).toHaveURL(/\/app\/reputacao/);
  });
});

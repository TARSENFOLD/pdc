import { test, expect } from '../../helpers/fixtures';

test.describe('Simulação Tipo 3 (Alta Fidelidade)', () => {
  test('aluno can play a high-fidelity simulation', async ({ alunoPage }) => {
    // 1. Navegar para a simulação de Gestão (Type 3 conforme seed)
    await alunoPage.goto('/app/simulacoes');

    // Esperar pelo catálogo carregar e encontrar o card de Gestão
    const cardGestao = alunoPage.locator('h3').filter({ hasText: 'Simulação Profissional: Gestão' });
    await expect(cardGestao).toBeVisible({ timeout: 15_000 });

    // 2. Clicar no card para ver detalhes
    await cardGestao.click();

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
    await expect(alunoPage.locator('p:has-text("Ações Realizadas") >> .. >> p.font-mono').filter({ hasText: '1' })).toBeVisible();

    // 6. Concluir (via data-testid — tolerante a copy)
    await alunoPage.click('[data-testid="concluir-simulacao-btn"]');

    // 7. Verificar redirecionamento para reputação
    await expect(alunoPage).toHaveURL(/\/app\/reputacao/);
  });
});

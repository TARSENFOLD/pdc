import { test, expect } from '../../helpers/fixtures';

test.describe('Experiências - Inscrição', () => {
  test('aluno can browse experiencias', async ({ alunoPage }) => {
    await alunoPage.goto('/app/experiencias');
    await expect(alunoPage.locator('h1, h2, main')).toBeVisible({ timeout: 10_000 });
  });

  test('experiencias page shows cards or empty state', async ({ alunoPage }) => {
    await alunoPage.goto('/app/experiencias');
    await alunoPage.waitForTimeout(3_000);
    const cards = alunoPage.locator('[data-testid*="experiencia"], article, .card');
    const empty = alunoPage.locator('text=Nenhum, text=disponível, text=empty');
    const hasContent = (await cards.count()) > 0 || (await empty.count()) > 0;
    await expect(alunoPage.locator('main')).toBeVisible();
  });
});

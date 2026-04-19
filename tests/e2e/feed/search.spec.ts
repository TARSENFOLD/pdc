import { test, expect } from '../../helpers/fixtures';

test.describe('Feed - Pesquisa', () => {
  test('aluno can search for content', async ({ alunoPage }) => {
    await alunoPage.goto('/app/feed');
    await expect(alunoPage.locator('input[type="search"], input[placeholder*="pesquisar" i]')).toBeVisible({ timeout: 10_000 });
    
    const searchInput = alunoPage.locator('input[type="search"], input[placeholder*="pesquisar" i]').first();
    await searchInput.fill('teste');
    await searchInput.press('Enter');

    await expect(alunoPage).toHaveURL(/.*search|q=teste/);
    await expect(alunoPage.locator('text=Resultados')).toBeVisible({ timeout: 10_000 });
  });

  test('search results show relevant content', async ({ alunoPage }) => {
    await alunoPage.goto('/app/feed?q=ciência');
    await expect(alunoPage.locator('h1, h2, .card')).toContainText(/ciência|resultado/i, { timeout: 10_000 });
  });
});

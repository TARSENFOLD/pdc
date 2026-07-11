import { test, expect } from '../../helpers/fixtures';

test.describe('Feed - Pesquisa', () => {
  test('aluno can search for content', async ({ alunoPage }) => {
    await alunoPage.goto('/app/feed');
    await expect(alunoPage.locator('input[type="search"], input[placeholder*="pesquisar" i]')).toBeVisible({ timeout: 15_000 });
    
    const searchInput = alunoPage.locator('input[type="search"], input[placeholder*="pesquisar" i]').first();
    await searchInput.fill('teste');

    await expect(alunoPage).toHaveURL(/.*q=teste/);
    await expect(alunoPage.getByTestId('feed')).toBeVisible({ timeout: 15_000 });
  });

  test('search results show relevant content', async ({ alunoPage }) => {
    await alunoPage.goto('/app/feed?q=ciência');
    await expect(alunoPage.getByTestId('feed')).toContainText(/resultado|publica/i, { timeout: 15_000 });
  });
});

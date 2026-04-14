import { test, expect } from '../../helpers/fixtures';

test.describe('Feed', () => {
  test('feed page loads for aluno', async ({ alunoPage }) => {
    await alunoPage.goto('/app/feed');
    await expect(alunoPage.locator('h1, h2, [data-testid="feed"]')).toBeVisible({ timeout: 10_000 });
  });

  test('feed shows posts or empty state', async ({ alunoPage }) => {
    await alunoPage.goto('/app/feed');
    const content = alunoPage.locator(
      '[data-testid="feed-list"], [data-testid="feed-empty"], [role="feed"], main'
    );
    await expect(content).toBeVisible({ timeout: 10_000 });
  });

  test('feed has tab or filter navigation', async ({ alunoPage }) => {
    await alunoPage.goto('/app/feed');
    await expect(alunoPage.locator('[role="tablist"], nav')).toBeVisible({ timeout: 10_000 });
  });

  test('feed does not show an error page', async ({ alunoPage }) => {
    await alunoPage.goto('/app/feed');
    await expect(alunoPage.locator('text=500, text=Error, text=Erro')).not.toBeVisible();
    await expect(alunoPage.locator('h1, h2, [data-testid="feed"]')).toBeVisible({ timeout: 10_000 });
  });
});

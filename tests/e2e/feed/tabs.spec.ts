import { test, expect } from '../../helpers/fixtures';

test.describe('Feed - Tabs', () => {
  test('feed page loads for aluno', async ({ alunoPage }) => {
    await alunoPage.goto('/app/feed');
    await expect(alunoPage.getByTestId('feed')).toBeVisible({ timeout: 15_000 });
  });

  test('feed shows tab navigation', async ({ alunoPage }) => {
    await alunoPage.goto('/app/feed');
    await expect(alunoPage.locator('[role="tablist"], nav')).toBeVisible({ timeout: 10_000 });
  });

  test('feed shows posts or empty state', async ({ alunoPage }) => {
    await alunoPage.goto('/app/feed');
    const content = alunoPage.locator('[data-testid="feed-list"], [role="feed"], main');
    await expect(content.first()).toBeVisible({ timeout: 10_000 });
  });
});

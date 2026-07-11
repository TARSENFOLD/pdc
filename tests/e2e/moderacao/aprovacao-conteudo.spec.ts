import { test, expect } from '../../helpers/fixtures';

test.describe('Moderação - Aprovação de Conteúdo', () => {
  test('moderador can access aprovacoes page', async ({ moderadorPage }) => {
    await moderadorPage.goto('/app/moderacao/aprovacoes');
    await expect(moderadorPage.getByRole('heading').first()).toBeVisible({ timeout: 10_000 });
  });

  test('aprovacoes shows pending content or empty state', async ({ moderadorPage }) => {
    await moderadorPage.goto('/app/moderacao/aprovacoes');
    await moderadorPage.waitForTimeout(3_000);
    const content = moderadorPage.locator('table, [data-testid="aprovacoes-list"], ul, [role="list"], main');
    await expect(content.first()).toBeVisible({ timeout: 5_000 });
  });
});

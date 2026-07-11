import { test, expect } from '../../helpers/fixtures';

test.describe('Moderação - Denúncias', () => {
  test('moderador can access denuncias page', async ({ moderadorPage }) => {
    await moderadorPage.goto('/app/moderacao/denuncias');
    await expect(moderadorPage.getByRole('heading').first()).toBeVisible({ timeout: 10_000 });
  });

  test('denuncias page shows queue or empty state', async ({ moderadorPage }) => {
    await moderadorPage.goto('/app/moderacao/denuncias');
    await moderadorPage.waitForTimeout(3_000);
    const queue = moderadorPage.locator('table, [data-testid="denuncias-list"], ul, [role="list"]');
    const empty = moderadorPage.locator('text=Nenhum, text=vazio, text=empty');
    const hasContent = (await queue.count()) > 0 || (await empty.count()) > 0;
    expect(hasContent).toBeTruthy();
  });

  test('aluno cannot access denuncias', async ({ alunoPage }) => {
    await alunoPage.goto('/app/moderacao/denuncias');
    await alunoPage.waitForTimeout(3_000);
    const url = alunoPage.url();
    const isBlocked = !url.includes('/moderacao/denuncias');
    expect(isBlocked).toBeTruthy();
  });
});

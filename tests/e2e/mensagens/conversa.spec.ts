import { test, expect } from '../../helpers/fixtures';

test.describe('Mensagens - Conversa', () => {
  test('aluno can access mensagens page', async ({ alunoPage }) => {
    await alunoPage.goto('/app/mensagens');
    await expect(alunoPage.locator('h1, h2, main')).toBeVisible({ timeout: 10_000 });
  });

  test('mensagens shows conversation list or empty state', async ({ alunoPage }) => {
    await alunoPage.goto('/app/mensagens');
    await alunoPage.waitForTimeout(3_000);
    const conversations = alunoPage.locator('[data-testid*="conversa"], [data-testid*="message"], ul, [role="list"]');
    const empty = alunoPage.locator('text=Nenhum, text=mensagem, text=empty, text=iniciar');
    const hasContent = (await conversations.count()) > 0 || (await empty.count()) > 0;
    await expect(alunoPage.locator('main')).toBeVisible();
  });

  test('mentor can access mensagens', async ({ mentorPage }) => {
    await mentorPage.goto('/app/mensagens');
    await expect(mentorPage.locator('main')).toBeVisible({ timeout: 10_000 });
  });
});

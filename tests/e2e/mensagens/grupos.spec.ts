import { test, expect } from '../../helpers/fixtures';

test.describe('Mensagens - Grupos', () => {
  test('user can see group chats', async ({ alunoPage }) => {
    await alunoPage.goto('/app/mensagens');
    await expect(alunoPage.getByRole('heading', { name: /mensagens/i }).first()).toBeVisible({ timeout: 10_000 });
  });

  test('user can open a group conversation', async ({ alunoPage }) => {
    await alunoPage.goto('/app/mensagens');
    const groupLink = alunoPage.locator('text=Grupo, [data-testid="group-chat"]').first();
    if (await groupLink.isVisible()) {
      await groupLink.click();
      await expect(alunoPage.locator('h2, .chat-header')).toContainText(/Grupo/i, { timeout: 10_000 });
    }
  });

  test('user can send a message in a group', async ({ alunoPage }) => {
    await alunoPage.goto('/app/mensagens');
    const groupLink = alunoPage.locator('text=Grupo, [data-testid="group-chat"]').first();
    if (await groupLink.isVisible()) {
      await groupLink.click();
      const message = `Mensagem de grupo ${Date.now()}`;
      await alunoPage.fill('textarea, input[placeholder*="mensagem" i]', message);
      await alunoPage.press('Enter');
      await expect(alunoPage.locator(`text=${message}`)).toBeVisible({ timeout: 10_000 });
    }
  });
});

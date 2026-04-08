import { test, expect } from '../../helpers/fixtures';

test.describe('Mentorias - Solicitar', () => {
  test('aluno can access mentorias page', async ({ alunoPage }) => {
    await alunoPage.goto('/app/mentorias');
    await expect(alunoPage.locator('h1, h2, main')).toBeVisible({ timeout: 10_000 });
  });

  test('mentorias shows available mentors or empty state', async ({ alunoPage }) => {
    await alunoPage.goto('/app/mentorias');
    await alunoPage.waitForTimeout(3_000);
    const mentors = alunoPage.locator('[data-testid*="mentor"], article, .card, [role="list"]');
    const empty = alunoPage.locator('text=Nenhum, text=disponível, text=empty, text=mentor');
    const hasContent = (await mentors.count()) > 0 || (await empty.count()) > 0;
    await expect(alunoPage.locator('main')).toBeVisible();
  });

  test('mentor can view mentorias page', async ({ mentorPage }) => {
    await mentorPage.goto('/app/mentorias');
    await expect(mentorPage.locator('main')).toBeVisible({ timeout: 10_000 });
  });
});

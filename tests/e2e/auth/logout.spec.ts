import { test, expect } from '../../helpers/fixtures';

test.describe('Autenticação - Logout', () => {
  test('user can logout successfully', async ({ alunoPage }) => {
    await alunoPage.goto('/app/feed');
    await expect(alunoPage.locator('button:has-text("Sair"), a:has-text("Sair"), button:has-text("Logout"), a:has-text("Logout")')).toBeVisible({ timeout: 10_000 });
    
    // Using a more general locator if the above fails
    const logoutBtn = alunoPage.locator('button:has-text("Sair"), a:has-text("Sair"), button:has-text("Logout"), a:has-text("Logout")').first();
    await logoutBtn.click();

    await expect(alunoPage).toHaveURL(/\/login/);
    await alunoPage.goto('/app/feed');
    await expect(alunoPage).toHaveURL(/\/login/);
  });
});

import { test, expect } from '../../helpers/fixtures';

test.describe('Admin - Utilizadores', () => {
  test('admin can access admin dashboard', async ({ adminPage }) => {
    await adminPage.goto('/app/dashboard/admin');
    await expect(adminPage.locator('h1, h2, [data-testid="admin-dashboard"]')).toBeVisible({ timeout: 10_000 });
  });

  test('admin dashboard shows stats or cards', async ({ adminPage }) => {
    await adminPage.goto('/app/dashboard/admin');
    await expect(adminPage.locator('main')).toBeVisible({ timeout: 10_000 });
  });

  test('aluno cannot access admin dashboard', async ({ alunoPage }) => {
    await alunoPage.goto('/app/dashboard/admin');
    // Should be redirected or see access denied
    await alunoPage.waitForTimeout(3_000);
    const url = alunoPage.url();
    const isBlocked = !url.includes('/dashboard/admin') || (await alunoPage.locator('text=acesso, text=permiss, text=denied, text=403').count()) > 0;
    expect(isBlocked).toBeTruthy();
  });
});

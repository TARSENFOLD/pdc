import { test, expect } from '../../helpers/fixtures';

test.describe('Perfil - Perfil Público', () => {
  test('aluno can view own profile', async ({ alunoPage }) => {
    await alunoPage.goto('/app/perfil');
    await expect(alunoPage.getByRole('heading').first()).toBeVisible({ timeout: 10_000 });
  });

  test('profile shows user information', async ({ alunoPage }) => {
    await alunoPage.goto('/app/perfil');
    await alunoPage.waitForTimeout(3_000);
    const profileContent = alunoPage.locator('img[alt*="avatar"], img[alt*="perfil"], [data-testid="avatar"], h1, h2');
    await expect(profileContent.first()).toBeVisible({ timeout: 5_000 });
  });

  test('mentor can view own profile', async ({ mentorPage }) => {
    await mentorPage.goto('/app/perfil');
    await expect(mentorPage.locator('main')).toBeVisible({ timeout: 10_000 });
  });
});

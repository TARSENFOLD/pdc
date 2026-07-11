import { test, expect } from '../../helpers/fixtures';

test.describe('RBAC', () => {
  test('aluno cannot access admin pages', async ({ alunoPage }) => {
    await alunoPage.goto('/app/dashboard/admin');
    // Should redirect away from admin
    await expect(alunoPage).not.toHaveURL(/dashboard\/admin/, { timeout: 5_000 });
  });

  test('aluno cannot access moderacao', async ({ alunoPage }) => {
    await alunoPage.goto('/app/moderacao/denuncias');
    await expect(alunoPage).not.toHaveURL(/moderacao/, { timeout: 5_000 });
  });

  test('aluno can access own dashboard', async ({ alunoPage }) => {
    await alunoPage.goto('/app/dashboard/estudante');
    await expect(alunoPage.getByRole('heading').first()).toBeVisible({ timeout: 10_000 });
  });

  test('mentor can access mentor dashboard', async ({ mentorPage }) => {
    await mentorPage.goto('/app/dashboard/mentor');
    await expect(mentorPage.getByRole('heading').first()).toBeVisible({ timeout: 10_000 });
  });

  test('mentor can access curso creation', async ({ mentorPage }) => {
    await mentorPage.goto('/app/mentor/cursos/criar');
    await expect(mentorPage.locator('form').first()).toBeVisible({ timeout: 10_000 });
  });

  test('admin can access admin dashboard', async ({ adminPage }) => {
    await adminPage.goto('/app/dashboard/admin');
    await expect(adminPage.locator('h1, h2')).toBeVisible({ timeout: 10_000 });
  });

  test('moderador can access denuncias', async ({ moderadorPage }) => {
    await moderadorPage.goto('/app/moderacao/denuncias');
    await expect(moderadorPage.locator('h1, h2')).toBeVisible({ timeout: 10_000 });
  });

  test('instituicao can access own dashboard', async ({ instituicaoPage }) => {
    await instituicaoPage.goto('/app/dashboard/instituicao');
    await expect(instituicaoPage.getByRole('heading').first()).toBeVisible({ timeout: 10_000 });
  });

  test('aluno cannot access mentor curso creation', async ({ alunoPage }) => {
    await alunoPage.goto('/app/mentor/cursos/criar');
    await expect(alunoPage).not.toHaveURL(/mentor\/cursos/, { timeout: 5_000 });
  });
});

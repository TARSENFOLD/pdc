import { test, expect } from '../../helpers/fixtures';

test.describe('RBAC - básico', () => {
  test('aluno is redirected away from admin route', async ({ alunoPage }) => {
    await alunoPage.goto('/app/dashboard/admin');
    await expect(alunoPage).not.toHaveURL(/dashboard\/admin/, { timeout: 5_000 });
  });

  test('aluno is redirected away from moderacao route', async ({ alunoPage }) => {
    await alunoPage.goto('/app/moderacao/denuncias');
    await expect(alunoPage).not.toHaveURL(/moderacao/, { timeout: 5_000 });
  });

  test('aluno can access own dashboard', async ({ alunoPage }) => {
    await alunoPage.goto('/app/dashboard/estudante');
    await expect(alunoPage.getByRole('heading').first()).toBeVisible({ timeout: 10_000 });
  });

  test('aluno cannot access mentor curso creation', async ({ alunoPage }) => {
    await alunoPage.goto('/app/mentor/cursos/criar');
    await expect(alunoPage).not.toHaveURL(/mentor\/cursos/, { timeout: 5_000 });
  });
});

import { test, expect } from '../../helpers/fixtures';

test.describe('Admin - Instituição', () => {
  test('instituicao user can view their dashboard', async ({ instituicaoPage }) => {
    await instituicaoPage.goto('/app/instituicao/dashboard');
    await expect(instituicaoPage.locator('h1, h2')).toContainText(/instituição|dashboard/i, { timeout: 10_000 });
  });

  test('instituicao can see their students', async ({ instituicaoPage }) => {
    await instituicaoPage.goto('/app/instituicao/alunos');
    await expect(instituicaoPage.locator('text=Alunos, text=Estudantes')).toBeVisible({ timeout: 10_000 });
  });

  test('instituicao can see reports', async ({ instituicaoPage }) => {
    await instituicaoPage.goto('/app/instituicao/relatorios');
    await expect(instituicaoPage.locator('text=Relatórios, text=Estatísticas')).toBeVisible({ timeout: 10_000 });
  });
});

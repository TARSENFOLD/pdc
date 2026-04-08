import { test, expect } from '../../helpers/fixtures';

test.describe('Criar Simulação', () => {
  test('mentor can access criar simulação', async ({ mentorPage }) => {
    await mentorPage.goto('/app/mentor/simulacoes/criar');
    await expect(mentorPage.locator('form, h1, h2')).toBeVisible({ timeout: 10_000 });
  });

  test('mentor sees simulações list', async ({ mentorPage }) => {
    await mentorPage.goto('/app/mentor/simulacoes');
    await expect(mentorPage.locator('h1, h2')).toBeVisible({ timeout: 10_000 });
  });

  test('relatório vocacional accessible', async ({ alunoPage }) => {
    await alunoPage.goto('/app/perfil-vocacional');
    await expect(alunoPage.locator('h1, h2')).toBeVisible({ timeout: 10_000 });
  });
});

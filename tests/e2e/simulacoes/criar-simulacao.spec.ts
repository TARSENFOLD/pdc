import { test, expect } from '../../helpers/fixtures';

test.describe('Criar Simulação', () => {
  test('QA interno pode aceder à criação de simulação', async ({ adminPage }) => {
    await adminPage.goto('/app/mentor/simulacoes/criar');
    await expect(adminPage.locator('form').first()).toBeVisible({ timeout: 10_000 });
  });

  test('mentor externo não pode aceder à criação de simulação', async ({ mentorPage }) => {
    await mentorPage.goto('/app/mentor/simulacoes/criar');
    await expect(mentorPage.getByText('Estúdio temporariamente indisponível')).toBeVisible();
  });

  test('mentor sees simulações list', async ({ mentorPage }) => {
    await mentorPage.goto('/app/mentor/simulacoes');
    await expect(mentorPage.getByRole('heading').first()).toBeVisible({ timeout: 10_000 });
  });

  test('relatório vocacional accessible', async ({ alunoPage }) => {
    await alunoPage.goto('/app/perfil-vocacional');
    await expect(alunoPage.getByRole('heading').first()).toBeVisible({ timeout: 10_000 });
  });
});

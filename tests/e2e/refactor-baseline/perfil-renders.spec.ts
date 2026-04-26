import { test, expect } from '../../helpers/fixtures';

/**
 * Perfil Renders — Refactor Baseline Safety Net
 * Valida que a página de perfil renderiza o heading principal (nome do utilizador).
 * Não asserções de copy — apenas presença do elemento via data-testid.
 * Gate para T12 (Perfis refactor). Se este suite estiver vermelho, T12 não pode arrancar.
 */
test.describe('Perfil Renders — Refactor Baseline', () => {
  test('perfil page renders main heading for aluno', async ({ alunoPage }) => {
    await alunoPage.goto('/app/perfil');
    await expect(alunoPage.locator('[data-testid="page-hero-title"]')).toBeVisible({ timeout: 15_000 });
  });

  test('perfil page renders main heading for mentor', async ({ mentorPage }) => {
    await mentorPage.goto('/app/perfil');
    await expect(mentorPage.locator('[data-testid="page-hero-title"]')).toBeVisible({ timeout: 15_000 });
  });

  test('perfil page chrome is present', async ({ alunoPage }) => {
    await alunoPage.goto('/app/perfil');
    await expect(alunoPage.locator('[data-testid="topbar"]')).toBeVisible({ timeout: 15_000 });
    await expect(alunoPage.locator('[data-testid="user-menu"]')).toBeVisible();
  });
});

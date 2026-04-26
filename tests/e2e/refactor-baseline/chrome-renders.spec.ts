import { test, expect } from '../../helpers/fixtures';

/**
 * Chrome Renders — Refactor Baseline Safety Net
 * Valida que o chrome (Sidebar, TopBar, RoleChipMenu) renderiza para todos os roles.
 * Gate para T3 (Chrome refactor). Se este suite estiver vermelho, T3 não pode arrancar.
 */
test.describe('Chrome Renders — Refactor Baseline', () => {
  test('chrome renders for aluno', async ({ alunoPage }) => {
    await alunoPage.goto('/app/home');
    await expect(alunoPage.locator('[data-testid="topbar"]')).toBeVisible({ timeout: 15_000 });
    await expect(alunoPage.locator('[data-testid="user-menu"]')).toBeVisible();
    await expect(alunoPage.locator('[data-testid="command-palette-trigger"]')).toBeVisible();
  });

  test('chrome renders for mentor', async ({ mentorPage }) => {
    await mentorPage.goto('/app/home');
    await expect(mentorPage.locator('[data-testid="topbar"]')).toBeVisible({ timeout: 15_000 });
    await expect(mentorPage.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('chrome renders for instituicao', async ({ instituicaoPage }) => {
    await instituicaoPage.goto('/app/home');
    await expect(instituicaoPage.locator('[data-testid="topbar"]')).toBeVisible({ timeout: 15_000 });
    await expect(instituicaoPage.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('chrome renders for moderador', async ({ moderadorPage }) => {
    await moderadorPage.goto('/app/home');
    await expect(moderadorPage.locator('[data-testid="topbar"]')).toBeVisible({ timeout: 15_000 });
    await expect(moderadorPage.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('chrome renders for admin', async ({ adminPage }) => {
    await adminPage.goto('/app/home');
    await expect(adminPage.locator('[data-testid="topbar"]')).toBeVisible({ timeout: 15_000 });
    await expect(adminPage.locator('[data-testid="user-menu"]')).toBeVisible();
  });
});

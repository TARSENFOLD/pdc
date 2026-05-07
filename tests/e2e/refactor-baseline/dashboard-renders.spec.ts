import { test, expect } from '../../helpers/fixtures';

/**
 * Dashboard Renders — Refactor Baseline Safety Net
 * Valida que os dashboards renderizam o heading principal para cada role.
 * Não asserções de copy — apenas presença do elemento via data-testid.
 * Gate para T6–T11 (Dashboard refactors). Se este suite estiver vermelho, os tickets de dashboard não podem arrancar.
 */
test.describe('Dashboard Renders — Refactor Baseline', () => {
  test('estudante dashboard renders main heading', async ({ alunoPage }) => {
    await alunoPage.goto('/app/home');
    await expect(alunoPage.locator('[data-testid="page-hero-title"]')).toBeVisible({ timeout: 15_000 });
    // Verifica que o chrome também está presente
    await expect(alunoPage.locator('[data-testid="topbar"]')).toBeVisible();
  });

  test('mentor dashboard renders main heading', async ({ mentorPage }) => {
    await mentorPage.goto('/app/home');
    await expect(mentorPage.locator('[data-testid="page-hero-title"]')).toBeVisible({ timeout: 15_000 });
    await expect(mentorPage.locator('[data-testid="topbar"]')).toBeVisible();
  });

  test('instituicao dashboard renders main heading', async ({ instituicaoPage }) => {
    await instituicaoPage.goto('/app/home');
    await expect(instituicaoPage.locator('[data-testid="page-hero-title"]')).toBeVisible({ timeout: 15_000 });
    await expect(instituicaoPage.locator('[data-testid="topbar"]')).toBeVisible();
  });

  test('moderador dashboard renders main heading', async ({ moderadorPage }) => {
    await moderadorPage.goto('/app/home');
    await expect(moderadorPage.locator('[data-testid="page-hero-title"]')).toBeVisible({ timeout: 15_000 });
    await expect(moderadorPage.locator('[data-testid="topbar"]')).toBeVisible();
  });

  test('admin dashboard renders main heading', async ({ adminPage }) => {
    await adminPage.goto('/app/home');
    await expect(adminPage.locator('[data-testid="page-hero-title"]')).toBeVisible({ timeout: 15_000 });
    await expect(adminPage.locator('[data-testid="topbar"]')).toBeVisible();
  });
});

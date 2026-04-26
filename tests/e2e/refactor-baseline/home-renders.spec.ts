import { test, expect } from '../../helpers/fixtures';

/**
 * Home Renders — Refactor Baseline Safety Net
 * Valida que a página home renderiza o heading principal para cada role.
 * Não asserções de copy — apenas presença do elemento via data-testid.
 * Gate para T5 (Frontend Home v2). Se este suite estiver vermelho, T5 não pode arrancar.
 */
test.describe('Home Renders — Refactor Baseline', () => {
  test('home renders heading for aluno role', async ({ alunoPage }) => {
    await alunoPage.goto('/app/home');
    await expect(alunoPage.locator('[data-testid="page-hero-title"]')).toBeVisible({ timeout: 15_000 });
  });

  test('home renders heading for mentor role', async ({ mentorPage }) => {
    await mentorPage.goto('/app/home');
    await expect(mentorPage.locator('[data-testid="page-hero-title"]')).toBeVisible({ timeout: 15_000 });
  });

  test('home renders heading for instituicao role', async ({ instituicaoPage }) => {
    await instituicaoPage.goto('/app/home');
    await expect(instituicaoPage.locator('[data-testid="page-hero-title"]')).toBeVisible({ timeout: 15_000 });
  });

  test('home renders heading for moderador role', async ({ moderadorPage }) => {
    await moderadorPage.goto('/app/home');
    await expect(moderadorPage.locator('[data-testid="page-hero-title"]')).toBeVisible({ timeout: 15_000 });
  });

  test('home renders heading for admin role', async ({ adminPage }) => {
    await adminPage.goto('/app/home');
    await expect(adminPage.locator('[data-testid="page-hero-title"]')).toBeVisible({ timeout: 15_000 });
  });
});

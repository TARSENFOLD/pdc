/**
 * Critical path smoke tests — run on every PR via the `smoke` Playwright project.
 *
 * Covers the 5 most important user journeys:
 *   1. Landing page is publicly accessible
 *   2. Home surface loads after authentication
 *   3. Role dashboard route loads after authentication
 *   4. Catálogo de cursos is visible
 *   5. Feed page loads with content or empty state
 */

import { test, expect } from '../helpers/fixtures';

async function expectRealRoute(page: import('@playwright/test').Page) {
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
  await expect(page.locator('main').first()).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('h1').filter({ hasText: /^404$/ })).toHaveCount(0);
  await expect(page.locator('text=Página não encontrada')).toHaveCount(0);
}

// ── 1. Landing page ─────────────────────────────────────────────────────────

test('landing page is publicly accessible', async ({ page }) => {
  await page.goto('/');
  // Should land on root or be redirected to a canonical landing
  await expect(page).toHaveURL(/\/$/);
  // Page title or any heading must be visible
  await expect(page.locator('h1, h2').first()).toBeVisible();
});

// ── 2. Authenticated home ───────────────────────────────────────────────────

test('authenticated home loads after login', async ({ alunoPage }) => {
  await alunoPage.goto('/app/home');
  await expectRealRoute(alunoPage);
  await expect(alunoPage.locator('main').first()).toBeVisible({ timeout: 10_000 });
});

// ── 3. Role dashboard ────────────────────────────────────────────────────────

test('estudante dashboard route exists and renders', async ({ alunoPage }) => {
  await alunoPage.goto('/app/dashboard/estudante');
  await expectRealRoute(alunoPage);
  await expect(alunoPage.locator('main').first()).toBeVisible({ timeout: 10_000 });
});

// ── 4. Catálogo de cursos ────────────────────────────────────────────────────

test('catalogo de cursos loads', async ({ alunoPage }) => {
  await alunoPage.goto('/app/cursos');
  await expectRealRoute(alunoPage);
  await expect(alunoPage.locator('h1, h2, [data-testid="catalogo"]').first()).toBeVisible({
    timeout: 12_000,
  });
  // Should not show an unhandled error page
  await expect(alunoPage.locator('[data-testid="error-boundary"], .error-page')).not.toBeVisible();
});

// ── 5. Feed ──────────────────────────────────────────────────────────────────

test('feed page loads with content or empty state', async ({ alunoPage }) => {
  await alunoPage.goto('/app/feed');
  await expectRealRoute(alunoPage);
  await expect(alunoPage.locator('main').first()).toContainText(/Publicar|Ainda não há publicações|Atividade da Rede|Mensagens Diretas/i, {
    timeout: 12_000,
  });
});

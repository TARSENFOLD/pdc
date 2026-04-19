/**
 * Critical path smoke tests — run on every PR via the `smoke` Playwright project.
 *
 * Covers the 5 most important user journeys:
 *   1. Landing page is publicly accessible
 *   2. Dashboard loads after authentication
 *   3. Basic RBAC: aluno cannot access admin-only routes
 *   4. Catálogo de cursos is visible
 *   5. Feed page loads with content or empty state
 */

import { test, expect } from '../helpers/fixtures';

// ── 1. Landing page ─────────────────────────────────────────────────────────

test('landing page is publicly accessible', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/^\//);
  // Page title or any heading must be visible
  await expect(page.locator('h1, h2, title')).not.toHaveCount(0);
});

// ── 2. Authenticated dashboard ───────────────────────────────────────────────

test('aluno dashboard loads after login', async ({ alunoPage }) => {
  await alunoPage.goto('/app/dashboard/aluno');
  // Should stay on the dashboard (not redirected to /login)
  await expect(alunoPage).not.toHaveURL(/\/login/, { timeout: 10_000 });
  await expect(alunoPage.locator('h1, h2, main')).toBeVisible({ timeout: 10_000 });
});

// ── 3. Basic RBAC ────────────────────────────────────────────────────────────

test('aluno cannot access super_admin routes', async ({ alunoPage }) => {
  await alunoPage.goto('/app/dashboard/admin');
  // Must be redirected away from admin dashboard
  await expect(alunoPage).not.toHaveURL(/dashboard\/admin/, { timeout: 8_000 });
});

// ── 4. Catálogo de cursos ────────────────────────────────────────────────────

test('catalogo de cursos loads', async ({ alunoPage }) => {
  await alunoPage.goto('/app/cursos');
  await expect(alunoPage.locator('h1, h2, [data-testid="catalogo"]')).toBeVisible({
    timeout: 12_000,
  });
  // Should not show an unhandled error page
  await expect(alunoPage.locator('[data-testid="error-boundary"], .error-page')).not.toBeVisible();
});

// ── 5. Feed ──────────────────────────────────────────────────────────────────

test('feed page loads with content or empty state', async ({ alunoPage }) => {
  await alunoPage.goto('/app/feed');
  // Either posts or an explicit empty state must be rendered
  await expect(
    alunoPage.locator('[data-testid="feed-list"], [data-testid="empty-state"], main article, main li'),
  ).toBeVisible({ timeout: 12_000 });
});

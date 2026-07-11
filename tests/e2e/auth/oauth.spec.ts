import { test, expect } from '../../helpers/fixtures';
import type { Page } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

async function clearSession(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.addInitScript(() => {
    window.localStorage.setItem('pdc.cookie-consent.v1', JSON.stringify({
      choice: 'essential',
      acceptedAt: '2026-01-01T00:00:00.000Z',
    }));
  });
  await page.goto('/login');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('pdc.cookie-consent.v1', JSON.stringify({
      choice: 'essential',
      acceptedAt: '2026-01-01T00:00:00.000Z',
    }));
  });
}

test.describe('OAuth', () => {
  test('Google OAuth button is visible on login', async ({ page }) => {
    await clearSession(page);
    await expect(page.locator('text=Google')).toBeVisible();
  });

  test('LinkedIn OAuth button is visible on login', async ({ page }) => {
    await clearSession(page);
    await expect(page.locator('text=LinkedIn')).toBeVisible();
  });

  test('Google OAuth redirects to Google consent', async ({ page }) => {
    await clearSession(page);
    await page.route('https://accounts.google.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<!doctype html><title>Google OAuth</title><main>Google OAuth consent</main>',
      });
    });
    const requestPromise = page.waitForRequest(/\/auth\/google/);
    const navigationPromise = page.waitForURL(/accounts\.google\.com/, { timeout: 15_000 });
    await page.click('text=Google');
    const request = await requestPromise;
    expect(request.url()).toMatch(/\/auth\/google/);
    await navigationPromise;
    expect(page.url()).toMatch(/accounts\.google\.com/);
  });
});

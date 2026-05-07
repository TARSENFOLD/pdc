import { test, expect } from '../../helpers/fixtures';
import type { Page } from '@playwright/test';

async function clearSession(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
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
    const requestPromise = page.waitForRequest(/\/auth\/google/);
    const popupPromise = (async () => {
      const popup = await page.waitForEvent('popup', { timeout: 15_000 });
      await popup.waitForLoadState();
      return popup.url();
    })();
    const navigationPromise = (async () => {
      await page.waitForURL(/accounts\.google\.com/, { timeout: 15_000 });
      return page.url();
    })();
    await page.click('text=Google');
    const request = await requestPromise;
    expect(request.url()).toMatch(/\/auth\/google/);
    const googleUrl = await Promise.any([popupPromise, navigationPromise]);
    expect(googleUrl).toMatch(/accounts\.google\.com/);
  });
});

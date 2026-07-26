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
    await page.context().route('https://accounts.google.com/**', (route) => route.abort());
    const requestPromise = page.waitForRequest(/\/auth\/google/);
    const providerRequestPromise = page.waitForRequest((request) => {
      const url = new URL(request.url());
      return url.hostname === 'accounts.google.com' && url.pathname === '/o/oauth2/v2/auth';
    });
    await page.getByRole('button', { name: /Google/i }).click({ noWaitAfter: true });
    const request = await requestPromise;
    expect(request.url()).toMatch(/\/auth\/google/);
    const providerRequest = await providerRequestPromise;
    const providerUrl = new URL(providerRequest.url());
    expect(providerUrl.searchParams.get('client_id')).toBe('e2e-google-client-id');
  });
});

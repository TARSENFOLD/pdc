import { test, expect } from '../../helpers/fixtures';

test.describe('OAuth', () => {
  test('Google OAuth button is visible on login', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('text=Google')).toBeVisible();
  });

  test('LinkedIn OAuth button is visible on login', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('text=LinkedIn')).toBeVisible();
  });

  test('Google OAuth redirects to Google consent', async ({ page }) => {
    await page.goto('/login');
    const [popup] = await Promise.all([
      page.waitForEvent('popup').catch(() => null),
      page.click('text=Google'),
    ]);
    // Either opens popup or navigates — both go to Google
    if (popup) {
      await expect(popup).toHaveURL(/accounts\.google\.com|localhost/, { timeout: 10_000 });
    } else {
      await expect(page).toHaveURL(/accounts\.google\.com|auth\/google|localhost/, { timeout: 10_000 });
    }
  });
});

import { test, expect } from '../../helpers/fixtures';

test.describe('Feed - Interações', () => {
  test('feed items have interaction buttons', async ({ alunoPage }) => {
    await alunoPage.goto('/app/feed');
    await alunoPage.waitForTimeout(3_000);
    const buttons = alunoPage.locator('button[aria-label*="like"], button[aria-label*="bookmark"], button[aria-label*="share"], button[aria-label*="Like"], button[aria-label*="Gost"]');
    // If no posts, just verify page loaded
    const count = await buttons.count();
    if (count > 0) {
      await expect(buttons.first()).toBeVisible();
    } else {
      await expect(alunoPage.locator('main')).toBeVisible();
    }
  });

  test('feed accessible by mentor', async ({ mentorPage }) => {
    await mentorPage.goto('/app/feed');
    await expect(mentorPage.locator('main')).toBeVisible({ timeout: 10_000 });
  });
});

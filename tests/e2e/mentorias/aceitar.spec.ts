import { test, expect } from '../../helpers/fixtures';

test.describe('Mentorias - Aceitar', () => {
  test('mentor can see pending mentoria requests', async ({ mentorPage }) => {
    await mentorPage.goto('/app/mentor/mentorias');
    await expect(mentorPage.locator('text=Pendentes, text=Solicitações')).toBeVisible({ timeout: 10_000 });
  });

  test('mentor can accept a mentoria request', async ({ mentorPage }) => {
    await mentorPage.goto('/app/mentor/mentorias');
    const acceptBtn = mentorPage.locator('button:has-text("Aceitar")').first();
    if (await acceptBtn.isVisible()) {
      await acceptBtn.click();
      await expect(mentorPage.locator('text=Sucesso, text=Aceite')).toBeVisible({ timeout: 10_000 });
    }
  });

  test('mentor can decline a mentoria request', async ({ mentorPage }) => {
    await mentorPage.goto('/app/mentor/mentorias');
    const declineBtn = mentorPage.locator('button:has-text("Recusar")').first();
    if (await declineBtn.isVisible()) {
      await declineBtn.click();
      await expect(mentorPage.locator('text=Sucesso, text=Recusada')).toBeVisible({ timeout: 10_000 });
    }
  });
});

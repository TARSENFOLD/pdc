import { test, expect, type Page } from '@playwright/test';

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

test.describe('Autenticação - Recuperação de Password', () => {
  test('user can request password recovery', async ({ page }) => {
    await clearSession(page);
    await page.getByRole('link', { name: /recover password|recuperar password|recuperar/i }).click();
    await expect(page).toHaveURL(/.*recuperar/);

    const email = page.getByRole('textbox', { name: 'Email' });
    await email.pressSequentially('test-recovery@example.com');
    await expect(email).toHaveValue('test-recovery@example.com');
    await page.getByRole('button', { name: /enviar link/i }).click();

    await expect(page.getByRole('status')).toContainText(/sucesso|email enviado/i, { timeout: 10_000 });
  });

  test('user sees error with invalid email', async ({ page }) => {
    await clearSession(page);
    await page.getByRole('link', { name: /recover password|recuperar password|recuperar/i }).click();
    const email = page.getByRole('textbox', { name: 'Email' });
    await email.pressSequentially('invalid-email');
    await expect(email).toHaveValue('invalid-email');
    await page.getByRole('button', { name: /enviar link/i }).click();

    await expect(page.getByRole('alert')).toContainText(/inválido|error/i, { timeout: 5_000 });
  });
});

import { test as setup, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// 7 canonical roles: aluno kept as invariant until W6 migration; estudante and comite_cientifico added
const roles = ['aluno', 'estudante', 'mentor', 'instituicao', 'moderador', 'comite_cientifico', 'super_admin'] as const;
const AUTH_DIR = path.join(__dirname, '../.auth');
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? 'password123';

// Ensure auth directory exists
if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

for (const role of roles) {
  setup(`authenticate as ${role}`, async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Navigate to login page and wait for the login form, not network idleness.
    await page.goto('/login');
    await page.waitForSelector('input[placeholder="nome@exemplo.com"]');
    
    // Fill credentials
    await page.fill('input[placeholder="nome@exemplo.com"]', `${role}@traycer.test`);
    await page.fill('input[placeholder="••••••••"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for either /app dashboard or /verificar page
    await expect(page).toHaveURL(/.*(\/app|\/verificar).*/, { timeout: 60_000 });

    if (page.url().includes('/verificar')) {
      // Handle OTP bypass
      await page.waitForSelector('input[placeholder="000000"]');
      await page.fill('input[placeholder="000000"]', '000000');
      await page.click('button[type="submit"]');
    }

    // Final confirmation: must be in /app
    await expect(page).toHaveURL(/.*\/app(\/|$)/, { timeout: 20_000 });

    await page.evaluate(() => {
      localStorage.removeItem('pdc:telemetry:pending');
    });

    // Save storage state (cookies + clean localStorage)
    const storagePath = path.join(AUTH_DIR, `${role}.json`);
    await context.storageState({ path: storagePath });
    await context.close();
  });
}

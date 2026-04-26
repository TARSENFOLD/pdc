import { test as setup, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const roles = ['aluno', 'mentor', 'instituicao', 'moderador', 'super_admin'] as const;
const AUTH_DIR = path.join(__dirname, '../.auth');

// Ensure auth directory exists
if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

for (const role of roles) {
  setup(`authenticate as ${role}`, async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Navigate to login page
    await page.goto('/login', { waitUntil: 'networkidle' });
    
    // Fill credentials
    await page.fill('input[placeholder="nome@exemplo.com"]', `${role}@traycer.test`);
    await page.fill('input[placeholder="••••••••"]', 'password123');
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

    // Save storage state (cookies + localStorage)
    const storagePath = path.join(AUTH_DIR, `${role}.json`);
    await context.storageState({ path: storagePath });
    await context.close();
  });
}

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
    await page.goto('/login');
    await page.fill('input[name="email"]', `${role}@traycer.test`);
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for navigation away from login (dashboard or OTP page)
    await page.waitForURL(/\/(app|verificar|dashboard)/, { timeout: 15_000 });

    // Save storage state (cookies + localStorage)
    const storagePath = path.join(AUTH_DIR, `${role}.json`);
    await context.storageState({ path: storagePath });
    await context.close();
  });
}

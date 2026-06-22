import { test as setup, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { E2E_ACEITE_LEGAL, E2E_DATA_NASCIMENTO_ADULTO } from '../helpers/compliance';

// `aluno` is a legacy fixture alias; both files authenticate the canonical estudante role.
const roles = ['aluno', 'estudante', 'mentor', 'instituicao', 'moderador', 'comite_cientifico', 'super_admin'] as const;
const AUTH_DIR = path.join(__dirname, '../.auth');
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? 'password123';

setup.describe.configure({ mode: 'serial', timeout: 90_000 });

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
    const accountRole = role === 'aluno' ? 'estudante' : role;
    await page.fill('input[placeholder="nome@exemplo.com"]', `${accountRole}@traycer.test`);
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

    const complianceResponse = await page.request.post('/api/auth/compliance/legal', {
      data: {
        dataNascimento: E2E_DATA_NASCIMENTO_ADULTO,
        aceiteLegal: E2E_ACEITE_LEGAL,
      },
    });
    expect(complianceResponse).toBeOK();

    if (accountRole === 'instituicao') {
      const provisionResponse = await page.request.post('/api/instituicoes/me/provisionar', {
        data: { nome: 'Instituição E2E PDC' },
      });
      expect(provisionResponse).toBeOK();
    }

    // Save storage state (cookies + clean localStorage)
    const storagePath = path.join(AUTH_DIR, `${role}.json`);
    const storageState = await context.storageState();
    storageState.origins = storageState.origins.map((origin) => ({
      ...origin,
      localStorage: origin.localStorage.filter((item) => item.name !== 'pdc:telemetry:pending'),
    }));
    fs.writeFileSync(storagePath, JSON.stringify(storageState, null, 2));
    await context.close();
  });
}

import { test as setup, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { E2E_ACEITE_LEGAL, E2E_DATA_NASCIMENTO_ADULTO } from '../helpers/compliance';

// `aluno` is a legacy fixture alias; both files authenticate the canonical estudante role.
const roles = ['aluno', 'estudante', 'mentor', 'instituicao', 'moderador', 'comite_cientifico', 'super_admin'] as const;
const AUTH_DIR = path.join(__dirname, '../.auth');
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? 'password123';
const COOKIE_CONSENT_STORAGE_KEY = 'pdc.cookie-consent.v1';
const ESSENTIAL_COOKIE_CONSENT = JSON.stringify({
  choice: 'essential',
  acceptedAt: '2026-01-01T00:00:00.000Z',
});
const STRAPI_URL = process.env.STRAPI_URL ?? 'http://localhost:1337';
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN ?? 'test-strapi-token';

setup.describe.configure({ mode: 'serial', timeout: 90_000 });

// Ensure auth directory exists
if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

setup('seed canonical E2E catalog content', async ({ request }) => {
  const headers = {
    Authorization: `Bearer ${STRAPI_API_TOKEN}`,
    'Content-Type': 'application/json',
  };
  const query = new URLSearchParams({
    'filters[slug][$eq]': 'sim-tipo3-e2e',
    'pagination[pageSize]': '1',
  });
  const existing = await request.get(`${STRAPI_URL}/api/simulacoes?${query.toString()}`, { headers });
  expect(existing).toBeOK();
  const existingBody = await existing.json() as { data?: unknown[] };
  if (!Array.isArray(existingBody.data) || existingBody.data.length === 0) {
    const created = await request.post(`${STRAPI_URL}/api/simulacoes`, {
      headers,
      data: {
        data: {
          titulo: 'Simulação Alta Fidelidade E2E',
          slug: 'sim-tipo3-e2e',
          descricao: 'Cenário E2E publicado para validar o player Tipo 3 e o ciclo de telemetria.',
          area: 'TECNOLOGIA',
          tipo: 3,
          tipoSimulacao: 'tipo3',
          tipoLab: 'sandbox',
          estado: 'published',
          autorId: 'e2e-seed',
          validadoAcademicamente: true,
          tentativasMaximas: 0,
          criteriosAvaliacao: { pesos: { fluidez: 40, resiliencia: 30, foco: 30 } },
        },
      },
    });
    expect(created).toBeOK();
  }

  const courseQuery = new URLSearchParams({
    'filters[slug][$eq]': 'curso-programa-e2e',
    'pagination[pageSize]': '1',
  });
  const existingCourse = await request.get(
    `${STRAPI_URL}/api/cursos?${courseQuery.toString()}`,
    { headers },
  );
  expect(existingCourse).toBeOK();
  const existingCourseBody = await existingCourse.json() as { data?: unknown[] };
  if (!Array.isArray(existingCourseBody.data) || existingCourseBody.data.length === 0) {
    const createdCourse = await request.post(`${STRAPI_URL}/api/cursos`, {
      headers,
      data: {
        data: {
          titulo: 'Curso Publicado E2E',
          slug: 'curso-programa-e2e',
          descricao: 'Curso publicado para validar relações de programas.',
          area: 'TECNOLOGIA',
          nivel: 'basico',
          estado: 'published',
          autorId: 'e2e-seed',
          gratuito: true,
          visibilidade: 'publico',
        },
      },
    });
    expect(createdCourse).toBeOK();
  }
});

for (const role of roles) {
  setup(`authenticate as ${role}`, async ({ browser }) => {
    const context = await browser.newContext();
    await context.addInitScript(
      ({ key, value }) => {
        window.localStorage.setItem(key, value);
      },
      { key: COOKIE_CONSENT_STORAGE_KEY, value: ESSENTIAL_COOKIE_CONSENT },
    );
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

    await page.evaluate(
      ({ key, value }) => {
        window.localStorage.setItem(key, value);
      },
      { key: COOKIE_CONSENT_STORAGE_KEY, value: ESSENTIAL_COOKIE_CONSENT },
    );

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

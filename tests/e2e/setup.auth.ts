import { test as setup, expect, type APIRequestContext } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
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

const SeedEntitySchema = z.object({
  id: z.union([z.string(), z.number()]),
  documentId: z.string().optional(),
});
const SeedListResponseSchema = z.object({ data: z.array(SeedEntitySchema).optional() });

interface CourseSeedPayload {
  titulo: string;
  slug: string;
  descricao: string;
  area: 'TECNOLOGIA';
  nivel: 'basico';
  estado: 'approved' | 'draft';
  autorId: string;
  gratuito: true;
  visibilidade: 'publico';
}

interface SimulationSeedPayload {
  titulo: string;
  slug: string;
  descricao: string;
  area: 'TECNOLOGIA';
  tipo: 3;
  tipoSimulacao: 'tipo3';
  tipoLab: 'sandbox';
  estado: 'approved';
  autorId: string;
  validadoAcademicamente: true;
  tentativasMaximas: 0;
  criteriosAvaliacao: { pesos: { fluidez: 40; resiliencia: 30; foco: 30 } };
}

type CatalogSeedPayload = CourseSeedPayload | SimulationSeedPayload;

async function upsertCatalogFixture(
  request: APIRequestContext,
  collection: 'cursos' | 'simulacoes',
  payload: CatalogSeedPayload,
  status: 'draft' | 'published',
): Promise<void> {
  const headers = {
    Authorization: `Bearer ${STRAPI_API_TOKEN}`,
    'Content-Type': 'application/json',
  };
  const find = async (requestedStatus: 'draft' | 'published') => {
    const query = new URLSearchParams({
      'filters[slug][$eq]': payload.slug,
      'pagination[pageSize]': '1',
      status: requestedStatus,
    });
    const response = await request.get(`${STRAPI_URL}/api/${collection}?${query.toString()}`, {
      headers,
    });
    expect(response).toBeOK();
    return SeedListResponseSchema.parse(await response.json()).data?.[0];
  };

  const existing = await find(status) ?? (status === 'published' ? await find('draft') : undefined);
  const response = existing
    ? await request.put(
        `${STRAPI_URL}/api/${collection}/${existing.documentId ?? String(existing.id)}?status=${status}`,
        { headers, data: { data: payload } },
      )
    : await request.post(`${STRAPI_URL}/api/${collection}?status=${status}`, {
        headers,
        data: { data: payload },
      });
  expect(response).toBeOK();

  const persisted = await find(status);
  expect(persisted, `${collection}/${payload.slug} must have a ${status} version`).toBeDefined();
}

setup.describe.configure({ mode: 'serial', timeout: 90_000 });

// Ensure auth directory exists
if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

setup('seed canonical E2E catalog content', async ({ request }) => {
  await upsertCatalogFixture(request, 'simulacoes', {
    titulo: 'Simulação Alta Fidelidade E2E',
    slug: 'sim-tipo3-e2e',
    descricao: 'Cenário E2E publicado para validar o player Tipo 3 e o ciclo de telemetria.',
    area: 'TECNOLOGIA',
    tipo: 3,
    tipoSimulacao: 'tipo3',
    tipoLab: 'sandbox',
    estado: 'approved',
    autorId: 'e2e-seed',
    validadoAcademicamente: true,
    tentativasMaximas: 0,
    criteriosAvaliacao: { pesos: { fluidez: 40, resiliencia: 30, foco: 30 } },
  }, 'published');

  await upsertCatalogFixture(request, 'cursos', {
    titulo: 'Curso Publicado E2E',
    slug: 'curso-programa-e2e',
    descricao: 'Curso aprovado com versão publicada para validar relações de programas.',
    area: 'TECNOLOGIA',
    nivel: 'basico',
    estado: 'approved',
    autorId: 'e2e-seed',
    gratuito: true,
    visibilidade: 'publico',
  }, 'published');

  await upsertCatalogFixture(request, 'cursos', {
    titulo: 'Curso Privado COR-0002 E2E',
    slug: 'curso-nao-publicado-cor-0002-e2e',
    descricao: 'Fixture privada para provar a contenção das rotas learner.',
    area: 'TECNOLOGIA',
    nivel: 'basico',
    estado: 'draft',
    autorId: 'e2e-private-author',
    gratuito: true,
    visibilidade: 'publico',
  }, 'draft');
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
